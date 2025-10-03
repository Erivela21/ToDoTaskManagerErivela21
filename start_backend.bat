@echo off
set TASK_API_HOST=0.0.0.0
set TASK_API_PORT=5000
set TASK_API_DEBUG=1
echo Starting backend on http://%TASK_API_HOST%:%TASK_API_PORT%
cd backend
python app.py
