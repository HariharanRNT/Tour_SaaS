from celery import Celery
from celery.schedules import crontab
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Use REDIS_URL from environment (matches .env and config.py — DB/0)
# DO NOT hardcode a different DB index here; always read from env
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Create the celery app
celery_app = Celery(
    "toursaas_worker",
    broker=redis_url,
    backend=redis_url,
    include=[
        "app.tasks.email_tasks",
        "app.tasks.email_recovery_tasks",
        "app.tasks.scheduler_tasks",
        "app.tasks.pdf_tasks"
    ]
)

# Celery Beat Schedule
# Uses crontab for deterministic daily scheduling at 9:00 AM IST
# (timezone="Asia/Kolkata" is set below, so crontab hour/minute is in IST)
celery_app.conf.beat_schedule = {
    "send-daily-trip-reminders": {
        "task": "app.tasks.scheduler_tasks.send_daily_trip_reminders",
        "schedule": crontab(hour=9, minute=0),  # 9:00 AM IST daily
    },
    "send-daily-subscription-reminders": {
        "task": "app.tasks.scheduler_tasks.send_expired_subscription_reminders",
        "schedule": crontab(hour=9, minute=15),  # 9:15 AM IST daily
    },
    "recover-stuck-emails": {
        "task": "app.tasks.email_recovery_tasks.recover_stuck_emails",
        "schedule": 600.0,  # Every 10 minutes (fine as float for sub-hour intervals)
    },
}

# Celery configuration
celery_app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",

    # Timezone
    timezone="Asia/Kolkata",
    enable_utc=True,

    # Task tracking
    task_track_started=True,
    task_time_limit=3600,

    # --- Reliability settings ---
    # Acknowledge task only AFTER it completes (not when picked up).
    # If the worker crashes mid-task, the task is re-queued automatically.
    task_acks_late=True,

    # Reject (not ack) the task if the worker process is lost unexpectedly.
    # Combined with task_acks_late, this ensures zero task loss on worker crash.
    task_reject_on_worker_lost=True,

    # Prefetch only 1 task at a time per worker process.
    # Prevents a worker from hoarding tasks it can't process while another is free.
    worker_prefetch_multiplier=1,

    # Auto-expire task results from Redis after 1 hour to prevent Redis memory bloat.
    result_expires=3600,

    # Retry broker connection on startup instead of raising an immediate error.
    # Useful when Redis starts slightly after the worker process.
    broker_connection_retry_on_startup=True,
)

# NOTE: No FastAPICache initialization here.
# FastAPICache is only needed in the FastAPI web process (see app/main.py lifespan).
# Worker processes use direct redis clients where caching is required (e.g., pdf_tasks.py).
