# To-Do List Manager

A minimal web-based To-Do List Manager built with Python Flask and SQLite, featuring CRUD operations and persistent storage.

## Setup Instructions

1. Install dependencies:
   ```
pip install -r requirements.txt
   ```
2. Run the backend server:
   ```
cd backend
python app.py
   ```
3. Open `frontend/index.html` in your browser.

## Project Structure
- `backend/` - Python Flask backend (API, models, database)
- `frontend/` - Minimal HTML/CSS/JS frontend
- `docs/` - Documentation and diagrams

## SDLC Summary
See `docs/SDLC_Report.md` for full details on planning, requirements, and design.

---

## Features
- Add, view, update, and delete tasks
- Each task: title, description, due date, status
- Persistent storage (SQLite)
- Minimal, intuitive UI

---

## License
MIT
