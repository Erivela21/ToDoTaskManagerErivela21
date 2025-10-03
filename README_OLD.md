# The Ultimate To-Do Task Manager

A Transformers-themed single-page task manager powered by a lightweight Flask API (JSON file persistence) and an animated, glassy UI.

## Architecture Overview

![Architecture Diagram](docs/architecture_diagram.png)

The application follows a simple client-server architecture with a Flask REST API backend and vanilla JavaScript frontend. Data is persisted in a JSON file for simplicity.

## Core Features Implemented

### 1. Complete CRUD Functionality
- **Create**: Add new tasks with title, description, due date, and status
- **Read**: View all tasks with filtering (All/Pending/Completed) 
- **Update**: Edit task details inline, toggle status between pending/completed
- **Delete**: Remove individual tasks or bulk delete completed tasks

### 2. Persistent Storage
- **JSON File Storage**: All tasks are saved to `backend/tasks.json`
- **Automatic Persistence**: Every CRUD operation immediately saves data
- **Data Survives Restarts**: Tasks persist across application shutdowns/restarts
- **Offline Support**: Frontend caches data and queues operations when backend is unreachable

### 3. RESTful API Endpoints
- `GET /tasks` - Retrieve all tasks
- `POST /tasks` - Create a new task  
- `PUT /tasks/<id>` - Update existing task
- `DELETE /tasks/<id>` - Delete a task

## Additional Features
## Additional Features
- Single unified Tasks panel (CRUD in one place)
- Inline editing (no page reloads)
- Status toggle (Done/Undo)
- Overdue highlighting for pending tasks
- Filter toolbar: All / Pending / Completed
- Bulk actions: Mark All Completed, Clear Completed
- Animated success GIF on create / edit / delete / status/bulk changes
- Progress & Achievements tab (unlock 10 Transformers characters as you complete tasks)
- Stats HUD (Total, Completed, Pending) auto-updates
- Persistent last active tab via localStorage
- Offline banner + retry if backend is unreachable (uses cached last data)
- Optimus Prime cinematic background with scanlines & subtle smoke puffs
- Responsive two-column layout (form/stats + list) collapsing gracefully on narrow screens

## Tech Stack
- **Backend**: Flask + CORS (simple JSON file storage in `backend/tasks.json`)
- **Frontend**: Vanilla HTML/CSS/JS (no build step)
- **Storage**: JSON file persistence 
- **API**: RESTful endpoints with full CRUD operations

## Prerequisites
- Python 3.7 or higher
- pip (Python package installer)

## Setup Instructions

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the Backend
Choose one of the following methods:

**Option A - Using provided scripts (Windows):**
```powershell
# PowerShell
./start_backend.ps1

# OR Command Prompt  
start_backend.bat
```

**Option B - Manual startup:**
```bash
cd backend
python app.py
```

The backend will start on `http://127.0.0.1:5000` by default.

### 3. Open the Frontend
Simply open `frontend/index.html` in any modern web browser, or serve it via a static server.

### 4. Verify Everything Works
1. Open the frontend in your browser
2. Create a test task
3. Verify it appears in the task list
4. Try editing, completing, and deleting tasks
5. Restart the backend and confirm tasks persist

## Environment Configuration
You can customize the backend using environment variables:

- `TASK_API_HOST`: Server host (default: 0.0.0.0)
- `TASK_API_PORT`: Server port (default: 5000) 
- `TASK_API_DEBUG`: Debug mode (default: 1)

**PowerShell Example:**
```powershell
$env:TASK_API_PORT = "8080"
cd backend
python app.py
```

## Data Persistence

All task data is stored in `backend/tasks.json`. This file is:
- Created automatically on first task creation
- Updated immediately on every CRUD operation  
- Human-readable JSON format
- Preserves data across application restarts

**Sample tasks.json structure:**
```json
[
  {
    "id": 1,
    "title": "Complete project documentation",
    "description": "Write comprehensive README and setup guide",
    "due_date": "2025-10-10",
    "status": "pending"
  }
]
```

## Network Access & LAN Setup

### For Local Development
If you open the frontend via `file://` protocol, it will connect to `127.0.0.1:5000`.

### For LAN Access  
1. Start the backend using the provided scripts (binds to 0.0.0.0)
2. Find your local IP address:
   ```powershell
   ipconfig | findstr IPv4
   ```
3. Other devices on your network can access:
   - API: `http://YOUR_IP:5000/tasks`
   - Frontend: Serve `frontend/index.html` and open `http://YOUR_IP/frontend/index.html`

The frontend auto-detects the hostname and adjusts the API URL accordingly.

## API Documentation

### Base URL
`http://127.0.0.1:5000`

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks` | Retrieve all tasks |
| POST | `/tasks` | Create a new task |
| PUT | `/tasks/<id>` | Update existing task |
| DELETE | `/tasks/<id>` | Delete a task |

### Request/Response Examples

**Create Task (POST /tasks):**
```json
Request:
{
  "title": "Learn Flask",
  "description": "Build a REST API",
  "due_date": "2025-10-15",
  "status": "pending"
}

Response (201):
{
  "id": 1,
  "title": "Learn Flask", 
  "description": "Build a REST API",
  "due_date": "2025-10-15",
  "status": "pending"
}
```

**Get All Tasks (GET /tasks):**
```json
Response (200):
[
  {
    "id": 1,
    "title": "Learn Flask",
    "description": "Build a REST API", 
    "due_date": "2025-10-15",
    "status": "pending"
  }
]
```

### Troubleshooting "API unreachable"
If the red offline banner appears:
1. Backend not running – start it.
2. Port already in use – choose another by setting `set TASK_API_PORT=5001` (or in PowerShell `$env:TASK_API_PORT='5001'`) and restart.
3. Firewall blocking – allow Python/port 5000 through Defender.
4. Using file:// and a custom port – update the port in `app.js` or serve the frontend via a lightweight server.
5. Network change (Wi‑Fi swap) – refresh; offline queue will sync when reachable again.

Queued offline operations persist in `localStorage` keys: `tasksLocal`, `offlineQueue`, `tempIdCounter`.

### Closing Extra Terminals in VS Code
If you accumulate many PowerShell terminals:
- Open terminal panel (``Ctrl+` ``) and click the trash icon beside each unused session.
- Or run the command palette `Terminal: Kill All Terminals`.

### Optional Enhancements
- Add a small badge for unsynced tasks.
- Periodic auto-retry instead of manual RETRY button.
- Switch to service worker for richer offline experience.

### Achievements System
Open the Progress tab to view a grid of unlockable Transformers. Completing tasks increases your total completed count and automatically unlocks characters at milestones (e.g. Bumblebee at 1, Megatron at 30, Optimus Prime at 55). Unlocks persist locally (browser storage). A progress bar shows how many of the 10 you’ve earned.


## Usage Tips
- Create a task with optional description, due date, and initial status.
- Click Done to mark completed; Undo to revert.
- Edit uses inline form; Cancel restores original view.
- Use filters to narrow the list; bulk actions operate only on the current dataset (full list for mark/clear logic).
- Overdue styling applies when due date < today and status is still pending.
- If the backend is down, an offline banner appears; actions will reattempt once reconnected.

## Project Structure
```
backend/
  app.py          # Flask API
  tasks.json      # Data store (JSON)
  task.py         # Legacy placeholder (not used in current implementation)
  task_manager.py # Legacy placeholder (not used)
  database.py     # Legacy placeholder (not used)
frontend/
  index.html
  style.css
  app.js
```

## Roadmap Ideas
- Search bar / tag system
- Drag-and-drop ordering
- Subtasks & priority
- Export / Import (JSON)
- Auth & multi-user mode

## Maintenance / Cleanup
Legacy placeholder modules (`task.py`, `task_manager.py`, `database.py`) remain for historical context; they can be safely removed if you want a leaner repo.

## License
MIT
