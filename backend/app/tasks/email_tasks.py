import asyncio
import logging
from typing import Dict, Any, Optional

from app.celery_app import celery_app
from app.services.email_service import EmailService
from app.models import NotificationLog

logger = logging.getLogger(__name__)

import sys
if sys.platform == 'win32':
    import asyncio
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except:
        pass


async def _execute_email_send(
    to_email: str, 
    subject: str, 
    html_body: str, 
    smtp_config: Optional[Dict[str, Any]],
    attachments: Optional[list],
    notification_log_id: Optional[str]
):
    from app.database import engine
    logger.info(f"Executing email send to {to_email} with subject: {subject}")
    try:
        # 1. Send the email
        success = await EmailService.send_email(
            to_email=to_email,
            subject=subject,
            body=html_body,
            attachments=attachments,
            smtp_config=smtp_config
        )
        
        # 2. Update log based on success
        if success:
            logger.info(f"Email successfully sent to {to_email}")
            if notification_log_id:
                await _update_notification_log(
                    notification_log_id, 
                    status="sent", 
                    error=None
                )
        else:
            # If EmailService returned False (e.g. SMTP config missing or send failed)
            error_msg = "EmailService.send_email returned False (check SMTP/provider logs)"
            logger.error(f"Failed to send email to {to_email}: {error_msg}")
            if notification_log_id:
                await _update_notification_log(
                    notification_log_id, 
                    status="failed", 
                    error=error_msg
                )
            raise Exception(error_msg)
    except Exception as e:
        logger.error(f"Error in _execute_email_send to {to_email}: {e}", exc_info=True)
        # update log as failed
        if notification_log_id:
            await _update_notification_log(
                notification_log_id, 
                status="failed", 
                error=str(e)
            )
        raise e
    finally:
        # IMPORTANT: Dispose of the engine to close connections while loop is alive
        # This prevents 'Event loop is closed' / 'NoneType' errors on Windows
        try:
            await engine.dispose()
            logger.debug("Engine disposed successfully in Celery worker.")
        except Exception as e:
            logger.error(f"Error disposing engine: {e}")

@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_email_task(
    self, 
    to_email: str, 
    subject: str, 
    html_body: str, 
    smtp_config: Optional[Dict[str, Any]] = None,
    attachment_b64: Optional[str] = None,
    attachment_filename: Optional[str] = None,
    notification_log_id: Optional[str] = None,
    attachments_b64: Optional[list] = None
):
    """
    Celery task to send an email asynchronously.
    Updates the NotificationLog status to 'sent' or 'failed'.
    """
    logger.info(f"Starting email task to {to_email} (LogID: {notification_log_id})")
    
    import base64
    attachments = []

    # Handle multiple attachments
    if attachments_b64:
        for a in attachments_b64:
            try:
                a_bytes = base64.b64decode(a['bytes_b64'])
                attachments.append({"bytes": a_bytes, "filename": a['filename']})
            except Exception as e:
                logger.error(f"Failed to decode b64 attachment {a.get('filename')}: {e}")

    # Backward compatibility for single attachment
    if attachment_b64 and attachment_filename:
        try:
            attachment_bytes = base64.b64decode(attachment_b64)
            attachments.append({"bytes": attachment_bytes, "filename": attachment_filename})
            logger.info(f"Decoded legacy b64 attachment: {len(attachment_bytes)} bytes")
        except Exception as e:
            logger.error(f"Failed to decode legacy b64 attachment: {e}")

    # Run the async logic in a SINGLE asyncio.run call
    try:
        asyncio.run(_execute_email_send(
            to_email, subject, html_body, smtp_config, 
            attachments, notification_log_id
        ))
        logger.info(f"Async email work completed for {to_email}")
    except Exception as exc:
        logger.error(f"Email task execution failed for {to_email}: {exc}")
        # Retry the task
        raise self.retry(exc=exc)

async def _update_notification_log(log_id_str: str, status: str, error: Optional[str]):
    from app.database import AsyncSessionLocal
    from app.models import NotificationLog
    from sqlalchemy import update
    from datetime import datetime, timezone
    import uuid
    
    if not log_id_str:
        return
        
    try:
        log_uuid = uuid.UUID(log_id_str)
        
        logger.debug(f"Updating NotificationLog {log_id_str} to status: {status}")
        
        async with AsyncSessionLocal() as session:
            updates = {
                "status": status,
                "error": error
            }
            if status == "sent":
                 updates["sent_at"] = datetime.now(timezone.utc)
                 
            stmt = update(NotificationLog).where(NotificationLog.id == log_uuid).values(**updates)
            await session.execute(stmt)
            await session.commit()
            logger.info(f"NotificationLog {log_id_str} updated to {status}")
    except Exception as e:
        logger.error(f"Failed to update NotificationLog {log_id_str}: {e}")

