import logging
import asyncio
from datetime import datetime, timezone, timedelta
from app.celery_app import celery_app
from app.database import AsyncSessionLocal
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
    import sys
    if sys.platform == 'win32':
        import asyncio
        try:
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        except:
            pass

    async def _run_recovery():
        redis_client = redis.from_url(settings.REDIS_URL)
        
        # Redis Lock for concurrency protection
        # Acquire lock for 60 seconds
        lock = redis_client.lock("email_queue_recovery_lock", timeout=60)
        
        acquired = await lock.acquire(blocking=False)
        if not acquired:
            logger.info("Could not acquire email recovery lock. Another worker is processing it.")
            await redis_client.aclose()
            return

        try:
            logger.info("Running stuck email recovery process...")
            async with AsyncSessionLocal() as session:
                # Find stuck logs
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
                    # Update status to RETRY before re-queueing to prevent double picking
                    log.status = EmailStatus.RETRY
                    log.retry_count = log.retry_count + 1
                    
                    if log.retry_count > log.max_retries:
                        log.status = EmailStatus.FAILED
                        log.error_message = "Max retries exceeded during queue recovery."
                        continue
                        
                    # Re-queue
                    try:
                        send_email_task.delay(
                            to_email=log.recipient_email,
                            subject=log.subject,
                            html_body=log.html_body,
                            email_log_id=str(log.id),
                            # Since this is a simple recovery, attachments handling 
                            # would need the original paths which might not be stored perfectly.
                            # Ideally, attachments should be retrievable from attachment_urls.
                        )
                    except Exception as e:
                        logger.error(f"Failed to requeue email log {log.id}: {e}")
                        
                await session.commit()
                logger.info("Recovery process completed.")
        finally:
            await lock.release()
            await redis_client.aclose()

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(_run_recovery())
        else:
            loop.run_until_complete(_run_recovery())
    except Exception as e:
        logger.error(f"Error in recover_stuck_emails: {e}")
