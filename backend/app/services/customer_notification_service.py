import logging
from datetime import datetime
from typing import Optional, Dict, Any
from app.models import Booking, User, Agent, NotificationLog, UserRole
from app.services.email_service import EmailService
from app.utils.customer_email_templates import get_customer_notification_html
from app.utils.crypto import decrypt_value
from app.database import AsyncSessionLocal
from app.tasks.email_tasks import send_email_task

logger = logging.getLogger(__name__)

class CustomerNotificationService:
    @staticmethod
    def get_agent_smtp_config(agent_user: User) -> Optional[Dict[str, Any]]:
        """
        Extracts Agent's SMTP credentials for sending customer notifications.
        """
        if not agent_user or not agent_user.agent_profile:
            return None
            
        ap = agent_user.agent_profile
        smtp_config = None
        
        try:
            # Check new settings table first
            if ap.smtp_settings:
                logger.info(f"Using Agent SMTP Settings (Table) for {agent_user.email}")
                smtp = ap.smtp_settings
                smtp_config = {
                    "host": smtp.host,
                    "port": smtp.port,
                    "user": smtp.username,
                    "password": decrypt_value(smtp.password),
                    "from_email": smtp.from_email,
                    "from_name": smtp.from_name
                }
            # Fallback to old columns
            elif ap.smtp_host and ap.smtp_user:
                logger.info(f"Using Agent SMTP (Legacy) for {agent_user.email}")
                smtp_config = {
                    "host": ap.smtp_host,
                    "port": ap.smtp_port,
                    "user": ap.smtp_user,
                    "password": ap.smtp_password, 
                    "from_email": ap.smtp_from_email,
                    "from_name": ap.agency_name or agent_user.first_name
                }
        except Exception as e:
            logger.error(f"Error resolving agent SMTP: {e}")
            
        return smtp_config

    @staticmethod
    def get_agency_name(agent_user: User) -> str:
        if agent_user and agent_user.agent_profile:
            return agent_user.agent_profile.agency_name or agent_user.first_name or "TourSaaS"
        return "TourSaaS"

    @staticmethod
    async def _send_notification(
        to_email: str,
        template_type: str,
        data: Dict[str, Any],
        agent_user: Optional[User],
        attachments: Optional[list] = None, # List of {"bytes": b"", "filename": ""}
        booking_id: Optional[str] = None
    ):
        """
        Internal method to generate HTML and enqueue the email via Celery.
        """
        if not to_email:
            logger.warning("Attempted to send notification without a destination email.")
            return

        agency_name = CustomerNotificationService.get_agency_name(agent_user)
        data["agency_name"] = agency_name
        
        # Inject support details
        support_email = "support@toursaas.com"
        support_phone = "N/A"
        if agent_user:
            support_email = agent_user.email
            support_phone = agent_user.phone if hasattr(agent_user, 'phone') and agent_user.phone else "N/A"
            
        data["support_email"] = support_email
        data["support_phone"] = support_phone

        # Resolve SMTP Config and Email Content
        smtp_config = CustomerNotificationService.get_agent_smtp_config(agent_user)
        subject, html_body = get_customer_notification_html(template_type, data)

        
        # Create a pending NotificationLog entry synchronously to pass to Celery
        try:
            async with AsyncSessionLocal() as session:
                log_entry = NotificationLog(
                    booking_id=booking_id,
                    type=template_type,
                    status="pending"
                )
                session.add(log_entry)
                await session.commit()
                await session.refresh(log_entry)
                log_id_str = str(log_entry.id)
        except Exception as e:
            logger.error(f"Failed to create NotificationLog: {e}")
            log_id_str = None

        try:
            import base64
            attachments_b64 = []
            if attachments:
                for a in attachments:
                    if a.get("bytes"):
                        attachments_b64.append({
                            "bytes_b64": base64.b64encode(a["bytes"]).decode('utf-8'),
                            "filename": a.get("filename", "attachment.pdf")
                        })
            
            send_email_task.delay(
                to_email=to_email,
                subject=subject,
                html_body=html_body,
                smtp_config=smtp_config,
                attachments_b64=attachments_b64,
                notification_log_id=log_id_str
            )
            logger.info(f"Successfully enqueued {template_type} email to {to_email} with {len(attachments_b64)} attachments")
        except Exception as e:
            logger.error(f"Failed to enqueue {template_type} email to {to_email}: {e}", exc_info=True)
            if log_id_str:
                try:
                    from sqlalchemy import update
                    async with AsyncSessionLocal() as session:
                        stmt = update(NotificationLog).where(NotificationLog.id == log_entry.id).values(status="failed", error=str(e))
                        await session.execute(stmt)
                        await session.commit()
                except Exception as log_exc:
                    pass

    @staticmethod
    async def send_registration_welcome(user: User, agent_user: Optional[User] = None):
        """Sends Welcome Email to newly registered customer using Agent's SMTP"""
        if not user or not user.email:
            return

        data = {
            "customer_name": f"{user.first_name} {user.last_name}" if hasattr(user, 'first_name') else "Valued Traveler",
        }
        
        # If agent not provided, try to resolve from user profile
        if not agent_user and hasattr(user, 'customer_profile') and user.customer_profile:
            agent_user = user.customer_profile.agent

        await CustomerNotificationService._send_notification(
            user.email,
            "customer_welcome",
            data,
            agent_user,
            attachments=None,
            booking_id=None
        )

    @staticmethod
    def _resolve_agent(booking: Booking) -> Optional[User]:
        """
        Resolves the Agent User for a booking.
        """
        # If the booking has an explicit agent_id, use that user
        if booking.agent:
            return booking.agent
            
        # Fallback: if the package creator is an agent
        if booking.package and booking.package.creator:
            if str(booking.package.creator.role).upper() == UserRole.AGENT:
                return booking.package.creator
                
        return None

    @staticmethod
    def _resolve_recipient_info(booking: Booking) -> tuple[str, str]:
        """
        Resolves the best recipient email and name for notifications.
        Returns: (email, name)
        """
        import json
        
        # Default to booking user (whoever initiated/owns the booking)
        email = booking.user.email if booking.user else None
        name = f"{booking.user.first_name} {booking.user.last_name}" if booking.user else "Customer"
        
        # 1. Check for Agent fallback
        # If the user is an AGENT, it means they are booking on behalf of someone.
        user_role = str(booking.user.role).upper() if booking.user and hasattr(booking.user.role, 'value') else str(booking.user.role).upper() if booking.user else ""
        
        is_agent_booking = "AGENT" in user_role
        
        logger.info(f"Checking for agent booking: role='{user_role}', is_agent_booking={is_agent_booking}")
        
        if is_agent_booking:
            # Try to find payment email from metadata captured in BookingOrchestrator
            if booking.special_requests:
                try:
                    meta = json.loads(booking.special_requests)
                    payment_email = meta.get('customer_payment_email')
                    if payment_email:
                        email = payment_email
                        logger.info(f"Using payment email for notification: {email}")
                except:
                    pass
            
            # Use Primary Traveler name if current user is the agent
            if booking.travelers:
                primary = next((t for t in booking.travelers if t.is_primary), booking.travelers[0])
                if primary:
                    name = f"{primary.first_name} {primary.last_name}"
                    logger.info(f"Using primary traveler name for notification: {name}")

        logger.info(f"RESOLVED NOTIFICATION RECIPIENT: email={email}, name={name} (is_agent_booking={is_agent_booking})")
        return email, name

    @staticmethod
    async def send_booking_confirmation(booking: Booking):
        """Sends Booking Confirmation using Customer_notification.txt template 1"""
        recipient_email, customer_name = CustomerNotificationService._resolve_recipient_info(booking)
        
        if not recipient_email:
            logger.warning(f"Could not resolve recipient email for booking confirmation: {booking.booking_reference}")
            return

        # Prepare Data
        data = {
            "customer_name": customer_name,
            "reference_id": booking.booking_reference,
            "package_name": booking.package.title,
            "travel_date": str(booking.travel_date),
            "travelers": booking.number_of_travelers,
            "total_amount": float(booking.total_amount)
        }
        
        agent_user = CustomerNotificationService._resolve_agent(booking)
        await CustomerNotificationService._send_notification(
            recipient_email,
            "booking_confirmation",
            data,
            agent_user,
            attachments=None,
            booking_id=str(booking.id)
        )

    @staticmethod
    async def send_payment_receipt(booking: Booking, payment_details: Dict[str, Any]):
        """Sends Payment Receipt using Customer_notification.txt template 2 with attached invoice PDF"""
        from app.services.invoice_service import InvoiceService
        
        recipient_email, customer_name = CustomerNotificationService._resolve_recipient_info(booking)
        if not recipient_email:
            logger.warning(f"Could not resolve recipient email for payment receipt: {booking.booking_reference}")
            return

        data = {
            "customer_name": customer_name,
            "package_name": booking.package.title,
            "reference_id": booking.booking_reference,
            "total_amount": payment_details.get("amount", float(booking.total_amount)),
            "payment_method": payment_details.get("method", "Online"),
            "payment_date": payment_details.get("date", "TBD")
        }

        # Generate Invoice PDF
        invoice_pdf_bytes = None
        invoice_filename = None
        try:
            logger.info(f"Attempting to generate invoice PDF for booking {booking.booking_reference}")
            # Mock user object for invoice generation title if it was a guest/payment email
            mock_user = booking.user
            if customer_name != f"{booking.user.first_name} {booking.user.last_name}":
                from app.models import User
                mock_user = User(first_name=customer_name.split(' ')[0], last_name=' '.join(customer_name.split(' ')[1:]))
            
            invoice_pdf_bytes = InvoiceService.generate_booking_invoice_pdf(booking, mock_user)
            if invoice_pdf_bytes:
                invoice_filename = f"Invoice_{booking.booking_reference}.pdf"
                logger.info(f"Successfully generated invoice PDF ({len(invoice_pdf_bytes)} bytes) for booking {booking.booking_reference}")
            else:
                logger.error(f"Invoice PDF generation returned None for booking {booking.booking_reference}")
        except Exception as e:
            logger.error(f"Failed to generate invoice PDF for booking {booking.id}: {e}", exc_info=True)

        agent_user = CustomerNotificationService._resolve_agent(booking)
        if not invoice_pdf_bytes:
            logger.error(f"CRITICAL: Payment Receipt for booking {booking.booking_reference} will be sent WITHOUT attachment (PDF generation failed)")
        
        attachments = []
        if invoice_pdf_bytes:
            attachments.append({"bytes": invoice_pdf_bytes, "filename": invoice_filename})

        await CustomerNotificationService._send_notification(
            recipient_email,
            "payment_receipt",
            data,
            agent_user,
            attachments=attachments,
            booking_id=str(booking.id)
        )

    @staticmethod
    async def send_itinerary_details(booking: Booking):
        """Sends Itinerary Details using Customer_notification.txt template 3"""
        from app.services.itinerary_pdf_service import ItineraryPdfService
        recipient_email, customer_name = CustomerNotificationService._resolve_recipient_info(booking)
        if not recipient_email:
            return

        # Build a simple itinerary summary from the package
        itinerary_summary = f"{booking.package.duration_days} Days / {booking.package.duration_nights} Nights in {booking.package.destination}"

        data = {
            "customer_name": customer_name,
            "package_name": booking.package.title,
            "itinerary_summary": itinerary_summary
        }

        # Generate Itinerary PDF
        itinerary_pdf_bytes = None
        itinerary_filename = None
        try:
            itinerary_pdf_bytes = ItineraryPdfService.generate_itinerary_pdf(booking.package, booking)
            if itinerary_pdf_bytes:
                itinerary_filename = f"Itinerary_{booking.booking_reference}.pdf"
        except Exception as e:
            logger.error(f"Failed to generate itinerary PDF for booking {booking.id}: {e}")

        agent_user = CustomerNotificationService._resolve_agent(booking)
        attachments = []
        if itinerary_pdf_bytes:
            attachments.append({"bytes": itinerary_pdf_bytes, "filename": itinerary_filename})

        await CustomerNotificationService._send_notification(
            recipient_email,
            "itinerary_details",
            data,
            agent_user,
            attachments=attachments,
            booking_id=str(booking.id)
        )

    @staticmethod
    async def send_booking_status_update(booking: Booking):
        """Sends Booking Status Update using Customer_notification.txt template 4"""
        recipient_email, customer_name = CustomerNotificationService._resolve_recipient_info(booking)
        if not recipient_email:
            return

        data = {
            "customer_name": customer_name,
            "reference_id": booking.booking_reference,
            "booking_status": str(booking.status.value).upper() if hasattr(booking.status, 'value') else str(booking.status).upper()
        }

        agent_user = CustomerNotificationService._resolve_agent(booking)
        await CustomerNotificationService._send_notification(
            recipient_email,
            "booking_status",
            data,
            agent_user,
            attachments=None,
            booking_id=str(booking.id)
        )

    @staticmethod
    async def send_trip_reminder(booking: Booking, days_prior: int):
        """Sends Trip Reminder (7d, 3d, 1d) using Customer_notification.txt templates 5 & 6"""
        recipient_email, customer_name = CustomerNotificationService._resolve_recipient_info(booking)
        if not recipient_email:
            return

        data = {
            "customer_name": customer_name,
            "package_name": booking.package.title,
            "travel_date": str(booking.travel_date),
            # Mock reporting time and pickup for 1-day reminder
            "reporting_time": "10:00 AM",
            "pickup_location": "Main Airport / Designated Pickup Zone"
        }

        template_key = f"trip_reminder_{days_prior}d"
        # Validate exact supported templates
        if template_key not in ["trip_reminder_7d", "trip_reminder_3d", "trip_reminder_1d"]:
            logger.warning(f"Unsupported reminder offset: {days_prior} days")
            return

        agent_user = CustomerNotificationService._resolve_agent(booking)
        await CustomerNotificationService._send_notification(
            recipient_email,
            template_key,
            data,
            agent_user,
            attachments=None,
            booking_id=str(booking.id)
        )

    @staticmethod
    async def send_cancellation_confirmation(
        booking: Booking,
        refund_amount: float,
        refund_status: str,
    ):
        """
        Sends booking cancellation email with refund details.
        Uses the 'booking_cancellation' template.
        refund_status: 'succeeded' | 'pending' | 'failed'
        """
        recipient_email, customer_name = CustomerNotificationService._resolve_recipient_info(booking)
        if not recipient_email:
            return

        if refund_status == "succeeded" and refund_amount > 0:
            refund_note = "Your refund will be credited to the original payment method within 5–7 business days."
        elif refund_amount > 0:
            refund_note = (
                "Your refund is being processed manually. "
                "Please contact support if you do not receive it within 7 business days."
            )
        else:
            refund_note = "No refund is applicable as per the cancellation policy."

        data = {
            "customer_name": customer_name,
            "reference_id": booking.booking_reference,
            "package_name": booking.package.title if booking.package else "N/A",
            "travel_date": str(booking.travel_date),
            "refund_amount": f"₹{refund_amount:,.2f}" if refund_amount > 0 else "₹0",
            "refund_status": refund_status,
            "refund_note": refund_note,
        }

        agent_user = CustomerNotificationService._resolve_agent(booking)
        await CustomerNotificationService._send_notification(
            recipient_email,
            "booking_cancellation",
            data,
            agent_user,
            attachments=None,
            booking_id=str(booking.id)
        )

    @staticmethod
    async def send_cancellation_agent_alert(
        booking: Booking,
        refund_amount: float,
    ):
        """
        Sends an alert to the Agent about a customer cancellation.
        """
        agent_user = CustomerNotificationService._resolve_agent(booking)
        if not agent_user or not agent_user.email:
            logger.warning(f"Cannot send agent cancellation alert: Agent email not found for booking {booking.id}")
            return

        recipient_email, customer_name = CustomerNotificationService._resolve_recipient_info(booking)

        data = {
            "customer_name": customer_name,
            "reference_id": booking.booking_reference,
            "package_name": booking.package.title if booking.package else "N/A",
            "travel_date": str(booking.travel_date),
            "refund_amount": f"₹{refund_amount:,.2f}" if refund_amount > 0 else "₹0",
            "cancellation_date": datetime.now().strftime("%Y-%m-%d %H:%M")
        }

        # We send this to the AGENT's email, potentially using system credentials 
        # because the agent's own SMTP might be for customer-facing only.
        # But we'll try to use the agent's SMTP if available for consistency.
        await CustomerNotificationService._send_notification(
            agent_user.email,
            "agent_cancellation_alert",
            data,
            agent_user, # Try to use agent's own SMTP to send to themselves
            attachments=None,
            booking_id=str(booking.id)
        )

    @staticmethod
    async def send_booking_success_consolidated(booking: Booking, payment_details: Optional[Dict[str, Any]] = None):
        """
        Consolidates Confirmation, Itinerary, and Receipt into a single professional email.
        Sends both Invoice and Itinerary PDFs as attachments.
        """
        from app.services.invoice_service import InvoiceService
        from app.services.itinerary_pdf_service import ItineraryPdfService
        
        recipient_email, customer_name = CustomerNotificationService._resolve_recipient_info(booking)
        if not recipient_email:
            logger.warning(f"ABORTING combined notification for {booking.booking_reference}: No recipient email found.")
            return

        logger.info(f"PREPARING COMBINED NOTIFICATION FOR: {recipient_email} (Ref: {booking.booking_reference})")

        # 1. Prepare Data
        data = {
            "customer_name": customer_name,
            "reference_id": booking.booking_reference,
            "package_name": booking.package.title,
            "travel_date": str(booking.travel_date),
            "travelers": booking.number_of_travelers,
            "total_amount": float(booking.total_amount),
            "payment_method": payment_details.get("method", "Online") if payment_details else "Online",
            "payment_date": payment_details.get("date", "Today") if payment_details else "Today",
            "itinerary_summary": f"{booking.package.duration_days} Days / {booking.package.duration_nights} Nights in {booking.package.destination}"
        }

        # 2. Generate Attachments
        attachments = []
        
        # A. Invoice PDF
        try:
            invoice_pdf = InvoiceService.generate_booking_invoice_pdf(booking, booking.user)
            if invoice_pdf:
                attachments.append({"bytes": invoice_pdf, "filename": f"Invoice_{booking.booking_reference}.pdf"})
        except Exception as e:
            logger.error(f"Failed to generate invoice for consolidated email: {e}")

        # B. Itinerary PDF
        try:
            itinerary_pdf = ItineraryPdfService.generate_itinerary_pdf(booking.package, booking)
            if itinerary_pdf:
                attachments.append({"bytes": itinerary_pdf, "filename": f"Itinerary_{booking.booking_reference}.pdf"})
        except Exception as e:
            logger.error(f"Failed to generate itinerary for consolidated email: {e}")

        # 3. Send
        agent_user = CustomerNotificationService._resolve_agent(booking)
        await CustomerNotificationService._send_notification(
            recipient_email,
            "booking_success_consolidated",
            data,
            agent_user,
            attachments=attachments,
            booking_id=str(booking.id)
        )

    @staticmethod
    async def send_refund_confirmed(booking: "Booking", refund_amount: float):
        """
        Sends a 'Refund Confirmed' email when Razorpay webhook confirms refund.processed.
        This is the SECOND email — the definitive confirmation to the customer.
        """
        recipient_email, customer_name = CustomerNotificationService._resolve_recipient_info(booking)
        if not recipient_email:
            return

        data = {
            "customer_name": customer_name,
            "reference_id": booking.booking_reference,
            "refund_amount": f"₹{refund_amount:,.2f}",
        }

        agent_user = CustomerNotificationService._resolve_agent(booking)
        await CustomerNotificationService._send_notification(
            recipient_email,
            "refund_confirmed",
            data,
            agent_user,
            attachments=None,
            booking_id=str(booking.id)
        )

    @staticmethod
    def _resolve_agent(booking: "Booking") -> Optional[User]:
        agent_user = booking.agent
        if not agent_user and booking.user and booking.user.customer_profile:
            agent_user = booking.user.customer_profile.agent
        return agent_user

