```mermaid
graph TB
    subgraph "User Interface Layer"
        Browser[Web Browser]
        subgraph "Frontend Application"
            HTML[index.html<br/>- Task Form<br/>- Task List<br/>- Progress Tab<br/>- Filters]
            CSS[style.css<br/>- Transformers Theme<br/>- Responsive Design<br/>- Animations]
            JS[app.js<br/>- API Calls<br/>- DOM Updates<br/>- Event Handling<br/>- State Management]
        end
    end

    subgraph "Application Layer"
        subgraph "Flask Web Server"
            FlaskApp[app.py]
            subgraph "API Endpoints"
                GET[GET /tasks<br/>Read All Tasks]
                POST[POST /tasks<br/>Create Task] 
                PUT[PUT /tasks/:id<br/>Update Task]
                DELETE[DELETE /tasks/:id<br/>Delete Task]
            end
            subgraph "Core Functions"
                LoadTasks[load_tasks()]
                SaveTasks[save_tasks()]
                GetNextId[get_next_id()]
                CORS[CORS handling]
            end
        end
    end

    subgraph "Data Persistence Layer"
        subgraph "File System Storage"
            JSON[tasks.json<br/>- Task ID<br/>- Title<br/>- Description<br/>- Due Date<br/>- Status]
        end
    end

    Browser --> HTML
    Browser --> CSS
    Browser --> JS
    
    JS -->|HTTP Requests<br/>CRUD Operations| FlaskApp
    
    FlaskApp --> GET
    FlaskApp --> POST
    FlaskApp --> PUT
    FlaskApp --> DELETE
    
    GET --> LoadTasks
    POST --> SaveTasks
    PUT --> LoadTasks
    PUT --> SaveTasks
    DELETE --> LoadTasks
    DELETE --> SaveTasks
    
    LoadTasks -->|File Read| JSON
    SaveTasks -->|File Write| JSON
    
    FlaskApp -->|JSON Response| JS

    classDef frontend fill:#e1f5fe
    classDef backend fill:#f3e5f5
    classDef storage fill:#e8f5e8
    
    class Browser,HTML,CSS,JS frontend
    class FlaskApp,GET,POST,PUT,DELETE,LoadTasks,SaveTasks,GetNextId,CORS backend
    class JSON storage
```

## Data Flow Diagrams

### Create Task Flow
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as Flask API
    participant J as JSON File
    
    U->>F: Fill task form & submit
    F->>F: Validate input
    F->>A: POST /tasks (JSON data)
    A->>J: Read existing tasks
    A->>A: Generate new ID
    A->>J: Write updated tasks
    A->>F: Return created task (201)
    F->>F: Update DOM
    F->>U: Show success feedback
```

### Read Tasks Flow
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as Flask API
    participant J as JSON File
    
    U->>F: Load page / refresh
    F->>A: GET /tasks
    A->>J: Read tasks.json
    A->>F: Return tasks array (200)
    F->>F: Render task list
    F->>U: Display tasks
```

### Update Task Flow
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as Flask API
    participant J as JSON File
    
    U->>F: Edit task inline
    F->>F: Capture changes
    F->>A: PUT /tasks/:id (updated data)
    A->>J: Read existing tasks
    A->>A: Find and update task
    A->>J: Write updated tasks
    A->>F: Return updated task (200)
    F->>F: Update DOM
    F->>U: Show success feedback
```

### Delete Task Flow
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as Flask API
    participant J as JSON File
    
    U->>F: Click delete button
    F->>F: Confirm deletion
    F->>A: DELETE /tasks/:id
    A->>J: Read existing tasks
    A->>A: Filter out deleted task
    A->>J: Write updated tasks
    A->>F: Return success (204)
    F->>F: Remove from DOM
    F->>U: Show deletion feedback
```

## System Architecture Components

### Frontend Components
```mermaid
graph LR
    subgraph "Frontend Architecture"
        UI[User Interface]
        State[State Management]
        API[API Client]
        Events[Event Handlers]
        
        UI --> State
        State --> API
        API --> Events
        Events --> UI
    end
```

### Backend Components  
```mermaid
graph LR
    subgraph "Backend Architecture"
        Routes[API Routes]
        Logic[Business Logic]
        Storage[File Storage]
        Validation[Data Validation]
        
        Routes --> Logic
        Logic --> Validation
        Validation --> Storage
        Storage --> Routes
    end
```