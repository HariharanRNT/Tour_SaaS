@echo off
echo ============================================
echo  RNT Tour - Celery Worker
echo ============================================

call .venv\Scripts\activate.bat

echo Starting Celery worker...
celery -A app.celery_app worker --loglevel=info -P solo
