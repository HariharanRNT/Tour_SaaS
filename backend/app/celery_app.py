from celery import Celery
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# We can use the primary Redis URL from the environment or default to localhost
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/1")

# Create the celery app
celery_app = Celery(
    "toursaas_worker",
    broker=redis_url,
    backend=redis_url,
    include=[
        "app.tasks.email_tasks",
        "app.tasks.scheduler_tasks",
        "app.tasks.pdf_tasks"
    ]
)

# Celery Beat Schedule
celery_app.conf.beat_schedule = {
    "send-daily-trip-reminders": {
        "task": "app.tasks.scheduler_tasks.send_daily_trip_reminders",
        "schedule": 86400.0, # Every 24 hours (Daily)
    },
}

# Optional configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,
)

# Startup Cache for Worker
from celery.signals import worker_process_init
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
import redis.asyncio as redis

@worker_process_init.connect
def init_cache(**kwargs):
    """Initialize Redis cache for worker processes"""
    # Create the redis connection
    redis_client = redis.from_url(redis_url, encoding="utf8", decode_responses=False)
    # FastAPICache initialization
    FastAPICache.init(RedisBackend(redis_client), prefix="fastapi-cache")
