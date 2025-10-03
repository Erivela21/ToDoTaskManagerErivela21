# PowerShell script to start the To-Do Task Manager backend
$env:TASK_API_HOST = "0.0.0.0"
$env:TASK_API_PORT = "5000"
$env:TASK_API_DEBUG = "1"
Write-Host "Starting backend on http://$($env:TASK_API_HOST):$($env:TASK_API_PORT)" -ForegroundColor Cyan
cd backend
python app.py
