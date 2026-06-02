import asyncio
import logging
from typing import Dict, Any, Optional

from app.celery_app import celery_app
from app.services.email_service import EmailService
from app.models import NotificationLog
from celery.signals import task_prerun, task_postrun, task_failure, task_retry
from celery.exceptions import Ignore
from datetime import datetime, timezone
import uuid

logger = logging.getLogger(__name__)


async def _execute_email_send(
    to_email: str,
    subject: str,
    html_body: str,
    smtp_config: Optional[Dict[str, Any]],
    attachments: Optional[list],
    notification_log_id: Optional[str],
    cc_emails: Optional[list] = None
):
    """
    Core async email-sending logic.
    Uses a task-local DB engine (NullPool) so it never touches the shared global engine.
    """
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
    from sqlalchemy.pool import NullPool
    from app.config import settings
    import os

    # Create a task-local engine so we never dispose the global shared engine
    task_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    TaskSessionLocal = async_sessionmaker(task_engine, class_=AsyncSession, expire_on_commit=False)

    logger.info(f"Executing email send to {to_email} with subject: {subject}")
    try:
        # Resolve file_paths / URLs to bytes if necessary
        resolved_attachments = []
        if attachments:
            for attach in attachments:
                if "bytes" in attach:
                    resolved_attachments.append(attach)
                elif "url" in attach:
                    try:
                        import requests
                        url = attach["url"]
                        print(f"[Celery] Downloading attachment from URL: {url}")
                        resp = requests.get(url, timeout=30)
                        if resp.status_code == 200:
                            resolved_attachments.append({
                                "bytes": resp.content,
                                "filename": attach.get("filename", url.split("/")[-1] or "attachment.pdf")
                            })
                            print(f"[Celery] Downloaded successfully: {len(resp.content)} bytes")
                        else:
                            logger.error(f"Failed to download attachment from {url}, status code: {resp.status_code}")
                    except Exception as e:
                        logger.error(f"Error downloading attachment from {attach.get('url')}: {e}")
                elif "file_path" in attach:
                    try:
                        file_path = os.path.abspath(attach["file_path"])
                        print(f"[Celery] Checking for PDF at: {file_path}")
                        if os.path.exists(file_path):
                            print(f"[Celery] File FOUND. Size: {os.path.getsize(file_path)} bytes")
                            with open(file_path, "rb") as f:
                                resolved_attachments.append({
                                    "bytes": f.read(),
                                    "filename": attach.get("filename", os.path.basename(file_path))
                                })
                        else:
                            print(f"[Celery] ERROR: File NOT FOUND at {file_path}")
                            logger.error(f"Attachment file not found: {file_path}")
                    except Exception as e:
                        logger.error(f"Failed to read attachment file {attach.get('file_path')}: {e}")

        print(f"[Celery] Sending email to: {to_email} with {len(resolved_attachments)} attachments")

        # Send the email
        success = await EmailService.send_email(
            to_email=to_email,
            subject=subject,
            body=html_body,
            attachments=resolved_attachments,
            smtp_config=smtp_config,
            cc_emails=cc_emails
        )
        print(f"[Celery] SMTP Success: {success}")

        # Update notification log based on result
        if success:
            logger.info(f"Email successfully sent to {to_email}")
            if notification_log_id:
                await _update_notification_log(
                    notification_log_id,
                    status="sent",
                    error=None,
                    session_factory=TaskSessionLocal
                )
        else:
            error_msg = "EmailService.send_email returned False (check SMTP/provider logs)"
            logger.error(f"Failed to send email to {to_email}: {error_msg}")
            if notification_log_id:
                await _update_notification_log(
                    notification_log_id,
                    status="failed",
                    error=error_msg,
                    session_factory=TaskSessionLocal
                )
            raise Exception(error_msg)

    except Exception as e:
        logger.error(f"Error in _execute_email_send to {to_email}: {e}", exc_info=True)
        if notification_log_id:
            await _update_notification_log(
                notification_log_id,
                status="failed",
                error=str(e),
                session_factory=TaskSessionLocal
            )
        raise e
    finally:
        # Safe to dispose — this is the TASK-LOCAL engine, not the global shared one
        try:
            await task_engine.dispose()
            logger.debug("Task-local engine disposed successfully.")
        except Exception as e:
            logger.error(f"Error disposing task-local engine: {e}")


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def send_email_task(
    self,
    to_email: str,
    subject: str,
    html_body: str,
    smtp_config: Optional[Dict[str, Any]] = None,
    attachment_b64: Optional[str] = None,
    attachment_filename: Optional[str] = None,
    notification_log_id: Optional[str] = None,
    email_log_id: Optional[str] = None,
    attachments_b64: Optional[list] = None,
    attachments: Optional[list] = None,
    cc_email: Optional[str] = None,
    cc_emails: Optional[list] = None,
    **kwargs
):
    """
    Celery task to send an email asynchronously.
    Updates the NotificationLog and EmailLog status.
    Retries with exponential backoff: 30s, 60s, 120s.
    """
    # Apply Windows event loop policy INSIDE the task (not at module import).
    # This is safe here because each task invocation runs in its own call stack.
    import sys
    if sys.platform == 'win32':
        try:
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        except Exception:
            pass

    logger.info(f"Starting email task to {to_email} (NotifLogID: {notification_log_id}, EmailLogID: {email_log_id})")

    import base64
    final_attachments = []

    # Handle multiple attachments from Base64
    if attachments_b64:
        for a in attachments_b64:
            try:
                a_bytes = base64.b64decode(a['bytes_b64'])
                final_attachments.append({"bytes": a_bytes, "filename": a['filename']})
            except Exception as e:
                logger.error(f"Failed to decode b64 attachment {a.get('filename')}: {e}")

    # Handle multiple attachments from file paths (passed via 'attachments')
    if attachments:
        for a in attachments:
            final_attachments.append(a)

    # Backward compatibility for single attachment
    if attachment_b64 and attachment_filename:
        try:
            attachment_bytes = base64.b64decode(attachment_b64)
            final_attachments.append({"bytes": attachment_bytes, "filename": attachment_filename})
            logger.info(f"Decoded legacy b64 attachment: {len(attachment_bytes)} bytes")
        except Exception as e:
            logger.error(f"Failed to decode legacy b64 attachment: {e}")

    # Consolidate CC emails
    final_cc = []
    if cc_email:
        final_cc.append(cc_email)
    if cc_emails:
        final_cc.extend(cc_emails)

    # Run the async logic in a single asyncio.run call
    try:
        asyncio.run(_execute_email_send(
            to_email, subject, html_body, smtp_config,
            final_attachments, notification_log_id,
            cc_emails=final_cc
        ))
        logger.info(f"Async email work completed for {to_email}")
    except Exception as exc:
        logger.error(f"Email task execution failed for {to_email}: {exc}")
        # Exponential backoff: retry 0 → 30s, retry 1 → 60s, retry 2 → 120s
        retry_delay = 30 * (2 ** self.request.retries)
        raise self.retry(exc=exc, countdown=retry_delay)


async def _update_notification_log(log_id_str: str, status: str, error: Optional[str], session_factory=None):
    """Update NotificationLog status. Accepts an optional session_factory for task-local sessions."""
    from sqlalchemy import update
    import uuid

    if not log_id_str:
        return

    # Use provided factory or fall back to global (FastAPI process)
    if session_factory is None:
        from app.database import AsyncSessionLocal
        session_factory = AsyncSessionLocal

    try:
        log_uuid = uuid.UUID(log_id_str)
        logger.debug(f"Updating NotificationLog {log_id_str} to status: {status}")

        async with session_factory() as session:
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


# --- Signal Handlers for EmailLog ---

def _sync_update_email_log(email_log_id: str, updates: dict):
    """
    Synchronous helper to update EmailLog from Celery signal handlers.
    Signal handlers always run synchronously in the worker process,
    so asyncio.run() is safe here (no event loop is running at signal time).
    """
    if not email_log_id:
        return
    try:
        from app.database import AsyncSessionLocal
        from app.models.email_log import EmailLog, EmailStatus
        from sqlalchemy import select, update
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
        from sqlalchemy.pool import NullPool
        from app.config import settings

        async def _update():
            # Use a task-local engine so we don't touch the global shared engine
            signal_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
            SignalSessionLocal = async_sessionmaker(signal_engine, class_=AsyncSession, expire_on_commit=False)
            try:
                async with SignalSessionLocal() as session:
                    log_uuid = uuid.UUID(email_log_id)
                    stmt = select(EmailLog).where(EmailLog.id == log_uuid)
                    result = await session.execute(stmt)
                    log = result.scalar_one_or_none()
                    if not log:
                        return

                    # Guard: do not overwrite EXPIRED status with SENT/FAILED
                    if log.status == EmailStatus.EXPIRED and updates.get("status") in [EmailStatus.SENT, EmailStatus.FAILED]:
                        return

                    upd_stmt = update(EmailLog).where(EmailLog.id == log_uuid).values(**updates)
                    await session.execute(upd_stmt)
                    await session.commit()
            finally:
                await signal_engine.dispose()

        # asyncio.run() is safe in signal handlers — no event loop is running
        asyncio.run(_update())

    except Exception as e:
        logger.error(f"Failed to update EmailLog from signal: {e}")


@task_prerun.connect(sender=send_email_task)
def email_task_prerun_handler(task_id, task, args, kwargs, **kw):
    email_log_id = kwargs.get('email_log_id')
    if not email_log_id:
        return

    try:
        from app.models.email_log import EmailLog, EmailStatus
        from sqlalchemy import select
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
        from sqlalchemy.pool import NullPool
        from app.config import settings

        async def _check_expiry():
            signal_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
            SignalSessionLocal = async_sessionmaker(signal_engine, class_=AsyncSession, expire_on_commit=False)
            try:
                async with SignalSessionLocal() as session:
                    log_uuid = uuid.UUID(email_log_id)
                    stmt = select(EmailLog).where(EmailLog.id == log_uuid)
                    result = await session.execute(stmt)
                    log = result.scalar_one_or_none()

                    if log and log.expires_at and log.expires_at < datetime.now(timezone.utc):
                        return True
                    return False
            finally:
                await signal_engine.dispose()

        # Safe: signal handlers run synchronously, no loop is running
        is_expired = asyncio.run(_check_expiry())

        if is_expired:
            _sync_update_email_log(email_log_id, {"status": "EXPIRED"})
            raise Ignore()

        _sync_update_email_log(email_log_id, {
            "status": "PROCESSING",
            "processing_started_at": datetime.now(timezone.utc),
            "celery_task_id": task_id
        })
    except Ignore:
        raise
    except Exception as e:
        logger.error(f"Error in prerun handler: {e}")


@task_postrun.connect(sender=send_email_task)
def email_task_postrun_handler(task_id, task, args, kwargs, retval, state, **kw):
    email_log_id = kwargs.get('email_log_id')
    if not email_log_id:
        return
    if state == 'SUCCESS':
        _sync_update_email_log(email_log_id, {
            "status": "SENT",
            "sent_time": datetime.now(timezone.utc)
        })


@task_failure.connect(sender=send_email_task)
def email_task_failure_handler(task_id, exception, args, kwargs, traceback, einfo, **kw):
    email_log_id = kwargs.get('email_log_id')
    if not email_log_id:
        return
    _sync_update_email_log(email_log_id, {
        "status": "FAILED",
        "error_message": str(exception)
    })


@task_retry.connect(sender=send_email_task)
def email_task_retry_handler(request, reason, einfo, **kw):
    email_log_id = request.kwargs.get('email_log_id')
    if not email_log_id:
        return
    _sync_update_email_log(email_log_id, {
        "status": "RETRY",
        "retry_count": request.retries,
        "error_message": str(reason)
    })
