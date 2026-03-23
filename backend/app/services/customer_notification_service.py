import logging
from typing import Optional, Dict, Any
from app.models import Booking, User, Agent
from app.services.email_service import EmailService
from app.utils.customer_email_templates import get_customer_notification_html
from app.utils.crypto import decrypt_value

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
        attachment_bytes: Optional[bytes] = None,
        attachment_filename: Optional[str] = None
    ):
        """
        Internal method to generate HTML and send the email.
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

        smtp_config = None
        if agent_user:
            smtp_config = CustomerNotificationService.get_agent_smtp_config(agent_user)

        subject, html_body = get_customer_notification_html(template_type, data)

        logger.info(f"Sending {template_type} notification to {to_email} via {'Agent SMTP' if smtp_config else 'System SMTP'}. Attachment: {attachment_filename or 'None'}")
        
        try:
            await EmailService.send_email(
                to_email=to_email,
                subject=subject,
                body=html_body,
                attachment_bytes=attachment_bytes,
                attachment_filename=attachment_filename,
                smtp_config=smtp_config
            )
            logger.info(f"Successfully dispatched {template_type} email to {to_email}")
        except Exception as e:
            logger.error(f"Failed to dispatch {template_type} email to {to_email}: {e}", exc_info=True)

    @staticmethod
    async def send_booking_confirmation(booking: Booking):
        """Sends Booking Confirmation using Customer_notification.txt template 1"""
        if not booking.user or not booking.user.email:
            return

        # Prepare Data
        data = {
            "customer_name": f"{booking.user.first_name} {booking.user.last_name}",
            "reference_id": booking.booking_reference,
            "package_name": booking.package.title,
            "travel_date": str(booking.travel_date),
            "travelers": booking.number_of_travelers,
            "total_amount": float(booking.total_amount)
        }
        
        agent_user = CustomerNotificationService._resolve_agent(booking)
        await CustomerNotificationService._send_notification(
            booking.user.email,
            "booking_confirmation",
            data,
            agent_user
        )

    @staticmethod
    async def send_payment_receipt(booking: Booking, payment_details: Dict[str, Any]):
        """Sends Payment Receipt using Customer_notification.txt template 2 with attached invoice PDF"""
        from app.services.invoice_service import InvoiceService
        
        if not booking.user or not booking.user.email:
            return

        data = {
            "customer_name": f"{booking.user.first_name} {booking.user.last_name}",
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
            invoice_pdf_bytes = InvoiceService.generate_booking_invoice_pdf(booking, booking.user)
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
        
        await CustomerNotificationService._send_notification(
            booking.user.email,
            "payment_receipt",
            data,
            agent_user,
            attachment_bytes=invoice_pdf_bytes,
            attachment_filename=invoice_filename
        )

    @staticmethod
    async def send_itinerary_details(booking: Booking):
        """Sends Itinerary Details using Customer_notification.txt template 3"""
        from app.services.itinerary_pdf_service import ItineraryPdfService
        if not booking.user or not booking.user.email:
            return

        # Build a simple itinerary summary from the package
        itinerary_summary = f"{booking.package.duration_days} Days / {booking.package.duration_nights} Nights in {booking.package.destination}"

        data = {
            "customer_name": f"{booking.user.first_name} {booking.user.last_name}",
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
        await CustomerNotificationService._send_notification(
            booking.user.email,
            "itinerary_details",
            data,
            agent_user,
            attachment_bytes=itinerary_pdf_bytes,
            attachment_filename=itinerary_filename
        )

    @staticmethod
    async def send_booking_status_update(booking: Booking):
        """Sends Booking Status Update using Customer_notification.txt template 4"""
        if not booking.user or not booking.user.email:
            return

        data = {
            "customer_name": f"{booking.user.first_name} {booking.user.last_name}",
            "reference_id": booking.booking_reference,
            "booking_status": str(booking.status.value).upper() if hasattr(booking.status, 'value') else str(booking.status).upper()
        }

        agent_user = CustomerNotificationService._resolve_agent(booking)
        await CustomerNotificationService._send_notification(
            booking.user.email,
            "booking_status",
            data,
            agent_user
        )

    @staticmethod
    async def send_trip_reminder(booking: Booking, days_prior: int):
        """Sends Trip Reminder (7d, 3d, 1d) using Customer_notification.txt templates 5 & 6"""
        if not booking.user or not booking.user.email:
            return

        data = {
            "customer_name": f"{booking.user.first_name} {booking.user.last_name}",
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
            booking.user.email,
            template_key,
            data,
            agent_user
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
        if not booking.user or not booking.user.email:
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
            "customer_name": f"{booking.user.first_name} {booking.user.last_name}",
            "reference_id": booking.booking_reference,
            "package_name": booking.package.title if booking.package else "N/A",
            "travel_date": str(booking.travel_date),
            "refund_amount": f"₹{refund_amount:,.2f}" if refund_amount > 0 else "₹0",
            "refund_status": refund_status,
            "refund_note": refund_note,
        }

        agent_user = CustomerNotificationService._resolve_agent(booking)
        await CustomerNotificationService._send_notification(
            booking.user.email,
            "booking_cancellation",
            data,
            agent_user,
        )

    @staticmethod
    def _resolve_agent(booking: Booking) -> Optional[User]:
        agent_user = booking.agent
        if not agent_user and booking.user and booking.user.customer_profile:
            agent_user = booking.user.customer_profile.agent
        return agent_user

