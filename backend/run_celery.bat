@echo off
echo Starting Celery Worker...
set REDIS_URL=redis://localhost:6379/1
celery -A app.celery_app worker --loglevel=info -P solo
