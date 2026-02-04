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
            # Don't fail the booking flow just because email failed
            
        return booking

    async def _get_booking(self, booking_id: UUID) -> Optional[Booking]:
        # Eager load relationships for email generation
        from sqlalchemy.orm import selectinload
        stmt = select(Booking).where(Booking.id == booking_id).options(
            selectinload(Booking.package),
            selectinload(Booking.travelers),
            selectinload(Booking.user).selectinload(User.agent_profile),
            selectinload(Booking.user).selectinload(User.admin_profile),
            selectinload(Booking.user).selectinload(User.customer_profile).selectinload(Customer.agent).selectinload(User.agent_profile)
        ).execution_options(populate_existing=True)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def _verify_payment(self, booking: Booking, verification: Dict[str, str]):
        # This logic is similar to payments.py, reused here for orchestration
        # In a real microservice, we'd call the Payment Service
        # For monolithic MVP, we act directly
        pass # Using existing Payment API for verification step first

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
