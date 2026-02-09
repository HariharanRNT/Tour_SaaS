import aiosmtplib
from email.message import EmailMessage
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    async def send_email(to_email: str, subject: str, body: str, attachment_bytes: bytes = None, attachment_filename: str = None, smtp_config: dict = None):
        """
        Sends an email with an optional attachment.
        If smtp_config is provided, uses those credentials. Otherwise uses system settings.
        smtp_config format: {"host": str, "port": int, "user": str, "password": str, "from_email": str, "from_name": str}
        """
        if smtp_config:
            host = smtp_config.get("host")
            port = smtp_config.get("port")
            user = smtp_config.get("user")
            password = smtp_config.get("password")
            from_email = smtp_config.get("from_email")
            from_name = smtp_config.get("from_name", settings.FROM_NAME)
        else:
            host = settings.SMTP_HOST
            port = settings.SMTP_PORT
            user = settings.SMTP_USER
            password = settings.SMTP_PASSWORD
            from_email = settings.FROM_EMAIL
            from_name = settings.FROM_NAME

        if not host or not user:
            logger.warning("SMTP settings not configured. Email not sent.")
            return False

        # Config override support
        if smtp_config:
             # Basic validation
             if not smtp_config.get("host") or not smtp_config.get("user"):
                 logger.warning("Invalid custom SMTP config provided. Fallback to system?")
                 # If custom config fails, we probably shouldn't fallback silently to system for an agent's customer, 
                 # as it might leak system branding where agent branding is expected. 
                 # But for reliability, maybe we should? 
                 # For now, let's just log and fail or retry with system if critical. 
                 # But the current logic (lines 16-30) either sets from config OR settings. 
                 # So if config provided but empty? 
                 pass


        message = EmailMessage()
        message["From"] = f"{from_name} <{from_email}>"
        message["To"] = to_email
        message["Subject"] = subject
        message.set_content(body, subtype='html')

        if attachment_bytes and attachment_filename:
            message.add_attachment(
                attachment_bytes,
                maintype="application",
                subtype="pdf",
                filename=attachment_filename
            )

        try:
            encryption_type = (smtp_config.get("encryption_type") or "tls").lower() if smtp_config else "tls"
            use_tls = encryption_type in ["ssl", "implicit", "tls_ssl"]
            start_tls = encryption_type in ["tls", "starttls", "explicit"]

            logger.info(f"Attempting to send email to {to_email} via {host}:{port}")
            logger.info(f"SMTP Config: User={user}, Encryption={encryption_type}, use_tls={use_tls}, start_tls={start_tls}")

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
            logger.info(f"Email sent successfully to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            # Log more details about the exception if it's an SMTP error
            if hasattr(e, 'code'):
                logger.error(f"SMTP Error Code: {e.code}, Response: {e.message}")
            return False
