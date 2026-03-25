import aiosmtplib
import logging
import re
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from app.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    async def send_email(to_email: str, subject: str, body: str, attachments: list = None, smtp_config: dict = None):
        """
        Sends an email with optional multiple attachments.
        attachments: list of dicts like {"bytes": b"", "filename": ""}
        """
        # 1. Determine Provider
        provider = (settings.EMAIL_PROVIDER or "smtp").lower()
        
        # If smtp_config is provided, force SMTP regardless of global provider
        if smtp_config:
            provider = "smtp"

        if provider == "sendgrid" and settings.SENDGRID_API_KEY:
            return await EmailService._send_via_sendgrid(to_email, subject, body, attachments)
        else:
            return await EmailService._send_via_smtp(to_email, subject, body, attachments, smtp_config)

    @staticmethod
    async def _send_via_sendgrid(to_email: str, subject: str, body: str, attachments: list = None):
        import sendgrid
        from sendgrid.helpers.mail import Mail, Email, To, Content, Attachment, FileContent, FileName, FileType, Disposition
        import base64

        logger.info(f"Attempting to send email to {to_email} via SendGrid")
        
        sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        from_email = Email(settings.FROM_EMAIL, settings.FROM_NAME)
        to_email_obj = To(to_email)
        content = Content("text/html", body)
        mail = Mail(from_email, to_email_obj, subject, content)

        if attachments:
            for attach in attachments:
                a_bytes = attach.get("bytes")
                a_filename = attach.get("filename")
                if a_bytes and a_filename:
                    encoded_file = base64.b64encode(a_bytes).decode()
                    attachedFile = Attachment(
                        FileContent(encoded_file),
                        FileName(a_filename),
                        FileType('application/pdf'),
                        Disposition('attachment')
                    )
                    mail.add_attachment(attachedFile)

        try:
            response = sg.send(mail)
            if response.status_code >= 200 and response.status_code < 300:
                logger.info(f"Email sent successfully to {to_email} via SendGrid")
                return True
            else:
                logger.error(f"SendGrid failed with status {response.status_code}: {response.body}")
                return False
        except Exception as e:
            logger.error(f"Failed to send email to {to_email} via SendGrid: {e}")
            return False

    @staticmethod
    async def _send_via_smtp(to_email, subject, body, attachments=None, smtp_config=None):
        """Sends email via SMTP with multiple attachment support"""
        
        # Determine SMTP settings (Agent vs System)
        if smtp_config:
            host = smtp_config.get("host")
            port = int(smtp_config.get("port", 587))
            user = smtp_config.get("user")
            password = smtp_config.get("password")
            from_name = smtp_config.get("from_name", settings.FROM_NAME)
            from_email = smtp_config.get("from_email", settings.FROM_EMAIL)
            
            # aiosmtplib requires use_tls and start_tls to be mutually exclusive
            encryption = (smtp_config.get("encryption_type") or "tls").lower()
            if encryption in ["ssl", "implicit"]:
                use_tls = True
                start_tls = False
            else:
                use_tls = False
                start_tls = True
        else:
            host = settings.SMTP_HOST
            port = int(settings.SMTP_PORT or 587)
            user = settings.SMTP_USER
            password = settings.SMTP_PASSWORD
            from_name = settings.FROM_NAME
            from_email = settings.FROM_EMAIL
            
            # System defaults: 465 is SSL, 587 is STARTTLS
            use_tls = (int(port) == 465)
            start_tls = not use_tls

        if not host or not user:
            logger.warning("SMTP settings not configured. Email not sent.")
            return False

        # Create the root message and set headers
        message = MIMEMultipart("mixed")
        message["From"] = f"{from_name} <{from_email}>"
        message["To"] = to_email
        message["Subject"] = subject

        # Create the body (HTML with a simple plain-text fallback)
        msg_body = MIMEMultipart("alternative")
        
        # Simple plain text version
        # Remove HTML tags for a very basic plain text version
        plain_text = re.sub('<[^<]+?>', '', body)
        
        msg_body.attach(MIMEText(plain_text, "plain", "utf-8"))
        msg_body.attach(MIMEText(body, "html", "utf-8"))
        
        message.attach(msg_body)

        if attachments:
            for attach in attachments:
                a_bytes = attach.get("bytes")
                a_filename = attach.get("filename")
                if a_bytes and a_filename:
                    logger.info(f"Attaching file {a_filename} ({len(a_bytes)} bytes)")
                    part = MIMEApplication(a_bytes, _subtype="pdf")
                    part.add_header('Content-Disposition', 'attachment', filename=a_filename)
                    message.attach(part)

        try:
            logger.info(f"Attempting to send email to {to_email} via SMTP ({host}:{port}, user={user}, use_tls={use_tls}, start_tls={start_tls})")
            
            # Ensure message is sent
            await aiosmtplib.send(
                message,
                hostname=host,
                port=port,
                username=user,
                password=password,
                use_tls=use_tls,
                start_tls=start_tls,
                timeout=20
            )
            logger.info(f"Email sent successfully to {to_email} via SMTP")
            print(f"DEBUG EMAIL: Sent successfully to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email via SMTP: {e}", exc_info=True)
            print(f"DEBUG EMAIL ERROR: {e}")
            return False
