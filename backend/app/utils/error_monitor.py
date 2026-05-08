import logging
import traceback
from datetime import datetime
from typing import Any, Dict, Optional
from app.config import settings
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)

# Sensitive keys that should be masked in emails
SENSITIVE_KEYS = {
    "password", "password_hash", "confirm_password", "new_password", "old_password",
    "token", "access_token", "refresh_token", "id_token", "otp", "otp_code",
    "key_secret", "key_id", "smtp_password", "razorpay_signature", "webhook_secret",
    "secret", "authorization", "cvv", "card_number"
}

def mask_sensitive_data(data: Any, depth: int = 0) -> Any:
    """Recursively mask sensitive values in dicts / lists."""
    if depth > 8:
        return data
    if isinstance(data, dict):
        return {
            k: ("***MASKED***" if k.lower() in SENSITIVE_KEYS else mask_sensitive_data(v, depth + 1))
            for k, v in data.items()
        }
    if isinstance(data, list):
        return [mask_sensitive_data(item, depth + 1) for item in data]
    return data

class ErrorMonitor:
    @staticmethod
    async def send_error_alert(
        error_type: str,
        message: str,
        error_details: Dict[str, Any],
        is_frontend: bool = False
    ):
        """
        Sends an error alert email to the administrator.
        """
        admin_email = getattr(settings, "ADMIN_ERROR_EMAIL", settings.FROM_EMAIL)
        env = getattr(settings, "ENV", "Production").upper()
        
        # Determine subject
        source = "FRONTEND" if is_frontend else "BACKEND"
        status_code = error_details.get("status_code", "Error")
        endpoint = error_details.get("endpoint") or error_details.get("url", "Unknown Route")
        subject = f"[{env}][{source}][{status_code}] {message[:50]} - {endpoint}"

        # Sanitize request data
        if "request_body" in error_details:
            error_details["request_body"] = mask_sensitive_data(error_details["request_body"])
        if "request_headers" in error_details:
            error_details["request_headers"] = mask_sensitive_data(error_details["request_headers"])
        if "payload" in error_details:
            error_details["payload"] = mask_sensitive_data(error_details["payload"])

        # Format HTML Body
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <div style="background-color: #f8d7da; color: #721c24; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                <h2 style="margin-top: 0;">⚠️ {source} Error Detected</h2>
                <p><strong>Type:</strong> {error_type}</p>
                <p><strong>Message:</strong> {message}</p>
                <p><strong>Timestamp:</strong> {timestamp}</p>
                <p><strong>Environment:</strong> {env}</p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 5px;">Context Information</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; width: 150px;"><strong>Endpoint/URL:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{endpoint}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Method:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{error_details.get('method', 'N/A')}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>User ID:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{error_details.get('user_id', 'Guest')}</td></tr>
                    {"<tr><td style='padding: 8px; border-bottom: 1px solid #eee;'><strong>Browser:</strong></td><td style='padding: 8px; border-bottom: 1px solid #eee;'>" + error_details.get('user_agent', 'N/A') + "</td></tr>" if is_frontend else ""}
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>IP Address:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{error_details.get('ip_address', 'N/A')}</td></tr>
                </table>
            </div>
        """

        # Request Body / Payload
        payload = error_details.get("request_body") or error_details.get("payload")
        if payload:
            import json
            html_body += f"""
            <div style="margin-bottom: 20px;">
                <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 5px;">Request Payload</h3>
                <pre style="background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; font-size: 12px;">{json.dumps(payload, indent=2)}</pre>
            </div>
            """

        # Stack Trace
        stack_trace = error_details.get("stack_trace")
        if stack_trace:
            html_body += f"""
            <div style="margin-bottom: 20px;">
                <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 5px;">Stack Trace</h3>
                <pre style="background: #272822; color: #f8f8f2; padding: 10px; border-radius: 5px; overflow-x: auto; font-size: 11px;">{stack_trace}</pre>
            </div>
            """

        html_body += """
            <div style="font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 10px;">
                This is an automated alert from the Tour SaaS Error Monitoring System.
            </div>
        </body>
        </html>
        """

        try:
            await EmailService.send_email(
                to_email=admin_email,
                subject=subject,
                body=html_body
            )
            logger.info(f"Error alert sent to {admin_email}")
        except Exception as e:
            logger.error(f"Failed to send error alert email: {e}")
