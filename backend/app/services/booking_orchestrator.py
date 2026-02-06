from datetime import datetime
from decimal import Decimal
import logging
from typing import Dict, Any, List, Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Booking, Payment, PaymentStatus, BookingStatus, User, Customer
from app.services.tripjack_adapter import TripJackAdapter
from app.config import settings

logger = logging.getLogger(__name__)

class BookingOrchestrator:
    """
    Coordinates the booking flow:
    1. Verify Payment
    2. Book Flight (if selected)
    3. Book Package
    4. Confirm Booking
    """
    
    def __init__(self, db: AsyncSession, tripjack_adapter: TripJackAdapter):
        self.db = db
        self.tripjack = tripjack_adapter

    async def process_checkout(
        self, 
        booking_id: UUID, 
        payment_verification: Dict[str, str],
        traveler_info: List[Dict[str, Any]]
    ) -> Booking:
        """
        Main choreography for checkout
        """
        # 1. Retrieve Booking
        booking = await self._get_booking(booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")

        # 2. Verify Payment (or skip if already paid - idempotent)
        if booking.payment_status != PaymentStatus.SUCCEEDED:
            await self._verify_payment(booking, payment_verification)
        
        # 3. Handle Flight Booking (if flight info exists)
        # Note: We store flight metadata in special_requests or a new column normally.
        # For now assuming flight details are in booking.special_requests JSON for MVP
        flight_booking_details = None
        if booking.special_requests and "flight_details" in str(booking.special_requests):
             # Logic to extract flight info and book
             try:
                 import json
                 requests = json.loads(booking.special_requests)
                 flight_booking_details = await self._book_flight_component(booking, traveler_info)

                 # Update requests with booking confirmation details
                 if flight_booking_details:
                     requests['flight_booking_confirmation'] = flight_booking_details
                     booking.special_requests = json.dumps(requests)

             except Exception as e:
                 logger.error(f"Flight booking failed: {e}")
                 # Refund logic would go here
                 raise HTTPException(status_code=500, detail=f"Flight booking failed: {str(e)}")

        # 4. Finalize Booking (Package)
        booking.status = BookingStatus.CONFIRMED
        booking.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(booking)
        

        
        # 5. Send Confirmation Email (Async/Fire-and-forget)
        try:
            await self._send_confirmation_email(booking)
        except Exception as e:
            logger.error(f"Failed to send confirmation email: {e}")
            
        # 6. Send Agent Notification Email
        try:
            await self._send_agent_notification_email(booking)
        except Exception as e:
            logger.error(f"Failed to send agent notification email: {e}")
            
        return booking

    async def _get_booking(self, booking_id: UUID) -> Optional[Booking]:
        # Eager load relationships for email generation
        from sqlalchemy.orm import selectinload
        stmt = select(Booking).where(Booking.id == booking_id).options(
            selectinload(Booking.package),
            selectinload(Booking.travelers),
            selectinload(Booking.agent),  # Load Agent directly
            selectinload(Booking.user).selectinload(User.agent_profile),
            selectinload(Booking.user).selectinload(User.admin_profile),
            selectinload(Booking.user).selectinload(User.customer_profile).selectinload(Customer.agent).selectinload(User.agent_profile)
        ).execution_options(populate_existing=True)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def _verify_payment(self, booking: Booking, verification: Dict[str, str]):
        """
        Verifies payment with Razorpay
        """
        import razorpay
        from app.models import PaymentStatus
        
        # 1. Check for mock mode override
        if "order_mock_" in verification.get("razorpay_order_id", ""):
             logger.info(f"Skipping verification for mock order: {booking.id}")
             booking.payment_status = PaymentStatus.SUCCEEDED
             return

        # 2. Verify Signature
        client = razorpay.Client(auth=(settings.RAZORPAY_BOOKING_KEY_ID, settings.RAZORPAY_BOOKING_KEY_SECRET))
        
        try:
             # Skip signature verification if using dummy/test keys globally (fallback safety)
             if "1234567890" not in settings.RAZORPAY_BOOKING_KEY_ID:
                client.utility.verify_payment_signature({
                    'razorpay_order_id': verification['razorpay_order_id'],
                    'razorpay_payment_id': verification['razorpay_payment_id'],
                    'razorpay_signature': verification['razorpay_signature']
                })
        except razorpay.errors.SignatureVerificationError:
             raise HTTPException(status_code=400, detail="Invalid payment signature")

        # 3. Secure Fetch & Amount Validation
        if "1234567890" not in settings.RAZORPAY_BOOKING_KEY_ID:
            try:
                # Fetch payment details from Razorpay
                fetched_payment = client.payment.fetch(verification['razorpay_payment_id'])
                
                # A. Status Check
                if fetched_payment['status'] != 'captured':
                     raise HTTPException(status_code=400, detail=f"Payment status is {fetched_payment['status']}, expected 'captured'")
                
                # B. Amount Check
                # Booking amount is Decimal/Float, Razorpay is int (paise)
                expected_amount_paise = int(booking.total_amount * 100)
                if fetched_payment['amount'] != expected_amount_paise:
                     raise HTTPException(
                         status_code=400, 
                         detail=f"Amount mismatch: Paid {fetched_payment['amount']/100}, Expected {booking.total_amount}"
                     )
                     
                # C. Currency Check
                if fetched_payment['currency'] != 'INR':
                    raise HTTPException(status_code=400, detail="Invalid currency")

            except Exception as e:
                 logger.error(f"Deep payment verification failed: {e}")
                 # Decide: Block or Log? For secure flow, we MUST Block.
                 if isinstance(e, HTTPException):
                     raise e
                 raise HTTPException(status_code=400, detail=f"Payment Verification Failed: {str(e)}")

        # 4. Update Status if passed
        booking.payment_status = PaymentStatus.SUCCEEDED
        
        # Also update the Payment record if it exists
        stmt = select(Payment).where(Payment.razorpay_order_id == verification['razorpay_order_id'])
        result = await self.db.execute(stmt)
        payment_record = result.scalar_one_or_none()
        
        if payment_record:
            payment_record.status = PaymentStatus.SUCCEEDED
            payment_record.razorpay_payment_id = verification['razorpay_payment_id']
            payment_record.razorpay_signature = verification['razorpay_signature']
            # We don't commit here, relying on outer scope commit or we flush
            await self.db.flush()

    async def _send_confirmation_email(self, booking: Booking):
        """
        Sends a booking confirmation email to the user
        """
        from app.services.email_service import EmailService
        
        if not booking.user or not booking.user.email:
            logger.warning(f"Booking {booking.booking_reference} has no user email linked. Skipping email.")
            return

        subject = f"Booking Confirmed: {booking.booking_reference} - {booking.package.title}"
        
        # Simple HTML Template
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                <h2 style="color: #2563eb; text-align: center;">Booking Confirmed!</h2>
                <p>Dear {booking.user.first_name} {booking.user.last_name},</p>
                
                <p>Thank you for booking with us! Your trip to <strong>{booking.package.destination}</strong> is successfully confirmed.</p>
                
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1e293b;">Booking Details</h3>
                    <p><strong>Reference ID:</strong> {booking.booking_reference}</p>
                    <p><strong>Package:</strong> {booking.package.title}</p>
                    <p><strong>Travel Date:</strong> {booking.travel_date}</p>
                    <p><strong>Travelers:</strong> {booking.number_of_travelers}</p>
                    <p><strong>Total Amount:</strong> {booking.total_amount} INR</p>
                </div>
                
                <h3>Itinerary Summary</h3>
                <p>{booking.package.duration_days} Days / {booking.package.duration_nights} Nights</p>
                
                <p>We have attached your detailed itinerary and invoice to your dashboard.</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                
                <p style="font-size: 12px; color: #666; text-align: center;">
                    Need help? Contact our support team.
                </p>
            </div>
        </body>
        </html>
        """
        
        
        # Determine SMTP Configuration (Agent vs Admin)
        smtp_config = None
        try:
             # Check if user has a customer profile linked to an agent
             if booking.user and booking.user.customer_profile and booking.user.customer_profile.agent:
                 agent_user = booking.user.customer_profile.agent
                 if agent_user.agent_profile:
                     ap = agent_user.agent_profile
                     if ap.smtp_host and ap.smtp_user:
                         logger.info(f"Using Agent SMTP for {agent_user.email}")
                         smtp_config = {
                             "host": ap.smtp_host,
                             "port": ap.smtp_port,
                             "user": ap.smtp_user,
                             "password": ap.smtp_password, # Decrypt if needed, currently plain
                             "from_email": ap.smtp_from_email,
                             "from_name": ap.agency_name or agent_user.first_name
                         }
        except Exception as e:
            logger.error(f"Error resolving agent SMTP: {e}")

        logger.info(f"Sending booking confirmation email to {booking.user.email}")
        await EmailService.send_email(
            to_email=booking.user.email,
            subject=subject,
            body=html_body,
            smtp_config=smtp_config
        )

    async def _send_agent_notification_email(self, booking: Booking):
        """
        Sends a notification email to the Agent about a new booking
        """
        from app.services.email_service import EmailService
        import json
        
        print(f"DEBUG: Attempting to send Agent Notification for Booking {booking.booking_reference}")

        # 1. Identify Agent
        agent_user = booking.agent
        if not agent_user:
             print(f"DEBUG: No agent_user found (booking.agent is None). Agent ID: {booking.agent_id}")
             # Attempt manual fetch if relationship failed?
             if booking.agent_id:
                  print("DEBUG: Fetching agent manually...")
                  result = await self.db.execute(select(User).where(User.id == booking.agent_id))
                  agent_user = result.scalar_one_or_none()
        
        if not agent_user or not agent_user.email:
            print(f"DEBUG: Agent user missing or has no email. Skipping notification.")
            logger.warning(f"Booking {booking.booking_reference} has no linked agent or agent email. Skipping notification.")
            return

        print(f"DEBUG: Found Agent: {agent_user.email} ({agent_user.first_name})")

        subject = f"NEW BOOKING: {booking.booking_reference} - {booking.package.title}"
        
        # 2. Extract Data
        # Parsing special requests for extra info
        special_requests = {}
        flight_pnr = "N/A"
        flight_price = 0.0
        try:
             if booking.special_requests:
                special_requests = json.loads(booking.special_requests)
                if 'flight_booking_confirmation' in special_requests:
                    flight_pnr = special_requests['flight_booking_confirmation'].get('bookingId', 'Booked')
                if 'flight_details' in special_requests:
                    flight_price = float(special_requests['flight_details'].get('price', 0))
        except:
             pass

        base_price = float(booking.total_amount) - flight_price

        # 3. HTML Template
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #1e293b; color: white; padding: 20px; text-align: center;">
                    <h2 style="margin: 0;">New Booking Received!</h2>
                </div>
                
                <div style="padding: 20px;">
                    <p>Dear {agent_user.first_name},</p>
                    <p>You have received a new booking for <strong>{booking.package.title}</strong>.</p>
                    
                    <!-- Booking Summary -->
                    <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                        <h3 style="margin-top: 0; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Booking Summary</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 5px 0; color: #64748b;">Reference ID:</td><td style="font-weight: bold;">{booking.booking_reference}</td></tr>
                            <tr><td style="padding: 5px 0; color: #64748b;">Booking Date:</td><td>{booking.booking_date}</td></tr>
                            <tr><td style="padding: 5px 0; color: #64748b;">Status:</td><td><span style="background-color: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 12px; font-size: 12px;">{booking.status.value.upper()}</span></td></tr>
                            <tr><td style="padding: 5px 0; color: #64748b;">Payment:</td><td><span style="background-color: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 12px; font-size: 12px;">{booking.payment_status.value.upper()}</span></td></tr>
                        </table>
                    </div>

                    <!-- Customer Details -->
                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Customer Details</h3>
                        <p style="margin: 5px 0;"><strong>Name:</strong> {booking.user.first_name} {booking.user.last_name}</p>
                        <p style="margin: 5px 0;"><strong>Email:</strong> {booking.user.email}</p>
                        <p style="margin: 5px 0;"><strong>Phone:</strong> {booking.user.phone or 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>Travelers:</strong> {booking.number_of_travelers}</p>
                    </div>

                    <!-- Package Details -->
                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Package Details</h3>
                        <p style="margin: 5px 0;"><strong>Package:</strong> {booking.package.title}</p>
                        <p style="margin: 5px 0;"><strong>Destination:</strong> {booking.package.destination}</p>
                        <p style="margin: 5px 0;"><strong>Duration:</strong> {booking.package.duration_days} Days / {booking.package.duration_nights} Nights</p>
                        <p style="margin: 5px 0;"><strong>Travel Date:</strong> {booking.travel_date}</p>
                    </div>

                    <!-- Pricing Breakdown -->
                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Pricing Breakdown</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 5px 0; color: #64748b;">Base Package:</td><td style="text-align: right;">₹{base_price:,.2f}</td></tr>
                            <tr><td style="padding: 5px 0; color: #64748b;">Flight Add-on:</td><td style="text-align: right;">₹{flight_price:,.2f}</td></tr>
                            <tr style="border-top: 1px dashed #cbd5e1;"><td style="padding: 10px 0; font-weight: bold;">Total Paid:</td><td style="text-align: right; font-weight: bold; color: #2563eb;">₹{float(booking.total_amount):,.2f}</td></tr>
                        </table>
                    </div>

                    <!-- Operational Info -->
                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Operational Info</h3>
                        <p style="margin: 5px 0;"><strong>Flight Booking ID / PNR:</strong> {flight_pnr}</p>
                        <p style="margin: 5px 0;"><strong>Notes:</strong> Please review special requests in the dashboard.</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="{settings.FRONTEND_URL}/agent/dashboard/bookings" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Booking in Dashboard</a>
                    </div>
                </div>
                
                <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
                    <p>This is an automated notification from your Tour SaaS Platform.</p>
                </div>
            </div>
        </body>
        </html>
        """

        logger.info(f"Sending Agent Notification to {agent_user.email}")
        await EmailService.send_email(
            to_email=agent_user.email,
            subject=subject,
            body=html_body,
            # Use System default SMTP to send TO the agent
        )
    async def _book_flight_component(self, booking: Booking, traveler_info: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Interacts with TripJack to book flight
        1. Parse flight details from booking
        2. Review Price
        3. Book Flight
        4. Retrieve Booking Details (PNR, etc)
        """
        import json
        
        # Parse stored flight meta
        flight_meta = {}
        if booking.special_requests:
            try:
                # assuming special_requests stores a json string
                meta = json.loads(booking.special_requests)
                flight_meta = meta.get("flight_details")
            except:
                pass
                
        if not flight_meta or "priceId" not in flight_meta:
            logger.warning("No valid flight priceId found for booking")
            return {}

        # 1. Retrieve Booking ID from DB (saved during Review step)
        tripjack_id = booking.tripjack_booking_id
        
        if not tripjack_id:
             logger.warning("TripJack Booking ID missing, using reference")
             tripjack_id = booking.booking_reference
        
        # 2. Prepare Booking Payload
        flight_amount = flight_meta.get("price", 0)
        
        tripjack_travellers = []
        for t in traveler_info:
            title = t.get("title", "Mr")
            if not title:
                gender = t.get("gender", "Male")
                title = "Mr" if gender == "Male" else "Ms"
                
            tripjack_travellers.append({
                "ti": title,
                "fN": t.get("first_name"),
                "lN": t.get("last_name"),
                "pt": t.get("type", "ADULT"),
                "dob": t.get("dob"), 
                "pNat": t.get("nationality", "IN"),
                "pNum": t.get("passport_number"),
                "eD": t.get("passport_expiry") 
            })

        booking_payload = {
            "bookingId": tripjack_id, 
            "paymentInfos": [
                {
                    "amount": str(flight_amount) 
                }
            ],
            "travellerInfo": tripjack_travellers,
            "deliveryInfo": {
                "emails": [booking.user.email] if booking.user and booking.user.email else ["agent@test.com"],
                "contacts": [booking.user.phone] if booking.user and booking.user.phone else ["9999999999"]
            }
        }

        # 3. Book
        logger.info(f"Booking flight with payload: {booking_payload}")
        book_res = await self.tripjack.book_flight(booking_payload)
        
        # 4. If booking successful, retrieve details immediately
        booking_details = {}
        if book_res and book_res.get('status', {}).get('success'):
             # Usually the booking ID is same as request, but let's see response
             # Or use the one we sent
             try:
                 booking_details = await self.tripjack.get_booking_details(tripjack_id)
             except Exception as e:
                 logger.error(f"Failed to fetch booking details immediately: {e}")
                 booking_details = book_res # Fallback to whatever booking API returned
        else:
             booking_details = book_res # pass through error/partial result

        return booking_details
