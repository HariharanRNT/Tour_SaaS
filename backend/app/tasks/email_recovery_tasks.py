import logging
import asyncio
from datetime import datetime, timezone, timedelta
from app.celery_app import celery_app
from app.models.email_log import EmailLog, EmailStatus
from sqlalchemy import select, update
import redis.asyncio as redis
from app.config import settings

logger = logging.getLogger(__name__)


# Note: Celery Beat needs to be running to pick up this task
@celery_app.task
def recover_stuck_emails():
    """
    Periodic task to find PENDING/PROCESSING emails that are stuck (older than 1 hour)
    and requeue them. Uses a Redis lock to ensure idempotency across multiple workers.
    """
    # Apply Windows event loop policy inside the task (safe here, not at module import)
    import sys
    if sys.platform == 'win32':
        try:
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        except Exception:
            pass

    # asyncio.run() creates a fresh event loop — safe and correct in Celery workers
    asyncio.run(_run_recovery())


async def _run_recovery():
    """Async implementation of the email recovery job."""
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
    from sqlalchemy.pool import NullPool

    redis_client = redis.from_url(settings.REDIS_URL)

    # Redis distributed lock — prevents two workers running recovery simultaneously
    lock = redis_client.lock("email_queue_recovery_lock", timeout=60)

    acquired = await lock.acquire(blocking=False)
    if not acquired:
        logger.info("Could not acquire email recovery lock. Another worker is processing it.")
        await redis_client.aclose()
        return

    # Create a task-local engine (NullPool) — safe to dispose after this task
    task_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    TaskSessionLocal = async_sessionmaker(task_engine, class_=AsyncSession, expire_on_commit=False)

    try:
        logger.info("Running stuck email recovery process...")
        async with TaskSessionLocal() as session:
            # Find emails stuck in PENDING or PROCESSING for more than 1 hour
            one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)

            stmt = select(EmailLog).where(
                EmailLog.status.in_([EmailStatus.PENDING, EmailStatus.PROCESSING]),
                EmailLog.created_at < one_hour_ago,
                EmailLog.is_deleted == False
            )

            result = await session.execute(stmt)
            stuck_logs = result.scalars().all()

            if not stuck_logs:
                logger.info("No stuck emails found.")
                return

            logger.info(f"Found {len(stuck_logs)} stuck emails. Requeueing...")
            from app.tasks.email_tasks import send_email_task

            for log in stuck_logs:
                # Mark as RETRY before re-queueing to prevent double-picking
                log.status = EmailStatus.RETRY
                log.retry_count = (log.retry_count or 0) + 1

                if log.retry_count > (log.max_retries or 3):
                    log.status = EmailStatus.FAILED
                    log.error_message = "Max retries exceeded during queue recovery."
                    logger.warning(f"Email log {log.id} marked as FAILED (max retries exceeded).")
                    continue

                # Re-queue the email task
                try:
                    # Build kwargs to pass to the task
                    task_kwargs = dict(
                        to_email=log.recipient_email,
                        subject=log.subject,
                        html_body=log.html_body,
                        email_log_id=str(log.id),
                    )

                    # If smtp_config was stored in metadata_info, forward it
                    # so agent-SMTP emails are re-sent through the correct provider
                    if log.metadata_info and isinstance(log.metadata_info, dict):
                        smtp_cfg = log.metadata_info.get("smtp_config")
                        if smtp_cfg:
                            task_kwargs["smtp_config"] = smtp_cfg

                    # If attachment URLs are stored, forward them for re-download
                    if log.attachment_urls:
                        task_kwargs["attachments"] = [
                            {"url": url, "filename": url.split("/")[-1] or "attachment.pdf"}
                            for url in log.attachment_urls
                            if url
                        ]

                    send_email_task.delay(**task_kwargs)
                    logger.info(f"Re-queued email log {log.id} for {log.recipient_email}")
                except Exception as e:
                    logger.error(f"Failed to requeue email log {log.id}: {e}")

            await session.commit()
            logger.info("Recovery process completed.")

    except Exception as e:
        logger.error(f"Error in _run_recovery: {e}", exc_info=True)
    finally:
        await lock.release()
        await redis_client.aclose()
        # Safe to dispose — this is the task-local engine
        await task_engine.dispose()
