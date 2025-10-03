# The Ultimate To-Do Task Manager

A Transformers-themed single-page task manager powered by a lightweight Flask API (JSON file persistence) and an animated, glassy UI.

## Architecture Overview

![Architecture Diagram](docs/architecture_diagram.png)

```
┌──────────────────────┐    HTTP/JSON     ┌──────────────────────┐    File I/O     ┌──────────────────────┐
│   WEB BROWSER        │◄────────────────►│   FLASK SERVER       │◄──────────────►│   FILE SYSTEM        │
│ ┌──────────────────┐ │    CRUD API      │ ┌──────────────────┐ │   JSON R/W      │ ┌──────────────────┐ │
│ │  Frontend (SPA)  │ │                  │ │  REST API        │ │                 │ │  tasks.json      │ │
│ │ HTML/CSS/JS      │ │                  │ │  app.py          │ │                 │ │  Data Storage    │ │
│ └──────────────────┘ │                  │ └──────────────────┘ │                 │ └──────────────────┘ │
└──────────────────────┘                  └──────────────────────┘                 └──────────────────────┘
     Presentation Tier                        Application Tier                          Data Tier
```

The application follows a simple **3-tier client-server architecture** with a Flask REST API backend and vanilla JavaScript frontend. Data is persisted in a JSON file for simplicity and rapid development.

### 📚 Architecture Documentation
- **[Complete Architecture Overview](docs/architecture_diagram.md)** - Detailed system design with ASCII diagrams
- **[Interactive Flow Diagrams](docs/architecture_diagram_mermaid.md)** - Mermaid diagrams for CRUD operations
- **[Architecture Summary](docs/architecture_summary.md)** - Quick reference and API documentation

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

## Troubleshooting

### "API unreachable" Error
If the red offline banner appears:
1. **Backend not running** - Start it using the setup instructions above
2. **Port already in use** - Set `TASK_API_PORT=5001` environment variable and restart
3. **Firewall blocking** - Allow Python/port 5000 through Windows Defender
4. **Network issues** - Refresh browser; offline operations are queued and will sync when reconnected

### VS Code Terminal Management
If you accumulate many PowerShell terminals:
- Open terminal panel (``Ctrl+` ``) and click trash icon beside unused sessions
- Or use Command Palette: `Terminal: Kill All Terminals`

### Data Not Persisting
1. Check that `backend/tasks.json` file exists and is writable
2. Verify backend logs show successful save operations
3. Ensure no filesystem permissions issues

## Project Structure
```
ToDoTaskManagerErivela21/
├── backend/
│   ├── app.py              # Flask REST API server
│   ├── tasks.json          # JSON data persistence file
│   ├── task_manager.py     # Task management logic (legacy)
│   ├── task.py            # Task model (legacy)
│   └── database.py        # Database handler (legacy/unused)
├── frontend/
│   ├── index.html         # Main application UI
│   ├── app.js            # Frontend JavaScript logic
│   └── style.css         # Transformers-themed styling
├── docs/
│   ├── architecture_diagram.png  # System architecture overview
│   ├── architecture_diagram.md   # Detailed architecture documentation
│   ├── architecture_diagram_mermaid.md  # Interactive flow diagrams
│   ├── architecture_summary.md   # Quick reference and API docs
│   └── SDLC_Report.md           # Development process documentation
├── requirements.txt       # Python dependencies
├── start_backend.ps1     # PowerShell startup script
├── start_backend.bat     # Windows batch startup script
└── README.md            # This file
```

## Development Notes

### Core Requirements Met
✅ **CRUD Functionality**: Complete Create, Read, Update, Delete operations
✅ **Persistent Storage**: JSON file storage with immediate persistence
✅ **RESTful API**: Standard HTTP methods with proper status codes  
✅ **User Interface**: Complete frontend with inline editing and real-time updates

### Offline Support
The application includes robust offline support:
- Operations are queued when backend is unreachable
- Data is cached locally for immediate UI updates
- Automatic retry and synchronization when connection is restored
- Queued operations persist in browser storage: `tasksLocal`, `offlineQueue`, `tempIdCounter`

### Achievements System
Complete tasks to unlock Transformers characters:
- Progress tracked locally in browser storage
- 10 unlockable characters based on completion milestones
- Visual progress indication and character galleries

## Usage Tips
- Create tasks with optional description, due date, and initial status
- Click Done to mark completed; Undo to revert status
- Use inline edit functionality for quick task modifications
- Apply filters to narrow task list view (All/Active/Completed)
- Bulk actions operate on currently visible filtered tasks
- Overdue styling automatically applied when due date < today and status is pending
- Offline mode ensures no data loss during network interruptions

## Future Enhancements
- Search bar and tag system for better organization
- Drag-and-drop task reordering
- Subtasks and priority levels
- Export/Import functionality (JSON/CSV)
- Authentication and multi-user support
- Mobile app version

## License
MIT

---

**For educational purposes - IE University Software and DevOps coursework**