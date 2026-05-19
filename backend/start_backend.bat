@echo off
echo ============================================
echo  RNT Tour - Backend Server (uvicorn)
echo ============================================

:: Activate virtual environment
call .venv\Scripts\activate.bat

:: Start uvicorn dev server
echo Starting FastAPI backend on http://localhost:8000 ...
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
