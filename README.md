# ToDoTaskManagerErivela21

A comprehensive To-Do List Manager application that allows users to manage tasks by creating, viewing, updating, and deleting them. The application provides both command-line and interactive interfaces for maximum flexibility.

## Features

- **Create Tasks**: Add new tasks with title, description, and priority levels
- **View Tasks**: List all tasks or filter by completion status (pending/completed)
- **Update Tasks**: Modify task properties like title, description, and priority
- **Delete Tasks**: Remove tasks from the list
- **Task Completion**: Mark tasks as completed or incomplete
- **Priority Management**: Set task priorities (low, medium, high)
- **Data Persistence**: Tasks are automatically saved to JSON file
- **Task Statistics**: View summary statistics of your tasks
- **Interactive CLI**: Both command-line and interactive modes

## Installation

No additional dependencies required. The application uses only Python standard library modules.

Requirements:
- Python 3.6 or higher

## Usage

### Command Line Mode

You can use the application directly from the command line:

```bash
# Add a new task
python3 todo_cli.py add "Buy groceries" "Milk, bread, eggs" high

# List all tasks
python3 todo_cli.py list

# List only pending tasks
python3 todo_cli.py list pending

# List only completed tasks
python3 todo_cli.py list completed

# Show detailed task information
python3 todo_cli.py show 1

# Complete a task
python3 todo_cli.py complete 1

# Update a task
python3 todo_cli.py update 2 "New title" "New description" medium

# Delete a task
python3 todo_cli.py delete 3

# Show task statistics
python3 todo_cli.py stats

# Show help
python3 todo_cli.py help
```

### Interactive Mode

Run the application without arguments to enter interactive mode:

```bash
python3 todo_cli.py
```

In interactive mode, you can use the same commands without the `python3 todo_cli.py` prefix:

```
todo> add "Learn Python" "Complete Python tutorial" high
todo> list
todo> complete 1
todo> stats
todo> exit
```

## Commands Reference

| Command | Description | Syntax |
|---------|-------------|--------|
| `add` | Create a new task | `add <title> [description] [priority]` |
| `list` | List tasks | `list [all\|pending\|completed]` |
| `show` | Show detailed task info | `show <id>` |
| `update` | Update task properties | `update <id> [title] [description] [priority]` |
| `complete` | Mark task as completed | `complete <id>` |
| `uncomplete` | Mark task as incomplete | `uncomplete <id>` |
| `delete` | Delete a task | `delete <id>` |
| `stats` | Show task statistics | `stats` |
| `help` | Show help information | `help` |
| `exit` | Exit interactive mode | `exit` |

## Priority Levels

- `high` (↑): High priority tasks
- `medium` (→): Medium priority tasks (default)
- `low` (↓): Low priority tasks

## Task Status Symbols

- `○`: Pending task
- `✓`: Completed task

## Data Storage

Tasks are automatically saved to `tasks.json` in the same directory as the application. The file is created automatically when you add your first task.

## Examples

### Basic Usage
```bash
# Add some tasks
python3 todo_cli.py add "Buy groceries" "Get milk, bread, and eggs" high
python3 todo_cli.py add "Exercise" "30 minutes of cardio" medium
python3 todo_cli.py add "Read book" "Continue reading Python book" low

# View all tasks
python3 todo_cli.py list

# Complete the first task
python3 todo_cli.py complete 1

# Update a task
python3 todo_cli.py update 2 "Exercise at gym" "45 minutes workout" high

# View statistics
python3 todo_cli.py stats
```

### Interactive Session Example
```
$ python3 todo_cli.py
Welcome to To-Do List Manager!
Type 'help' for available commands or 'exit' to quit.

todo> add "Write documentation" "Complete project README" high
Task created: [1] ○ ↑ Write documentation

todo> add "Test application" "Run all test cases" medium
Task created: [2] ○ → Test application

todo> list
All Tasks:
----------------------------------------
[1] ○ ↑ Write documentation
[2] ○ → Test application

todo> complete 1
Task completed: [1] ✓ ↑ Write documentation

todo> stats
Task Statistics:
----------------------------------------
Total Tasks: 2
Completed: 1
Pending: 1

By Priority:
  High: 1
  Medium: 1
  Low: 0

todo> exit
Goodbye!
```

## Project Structure

- `task.py` - Task class definition with properties and methods
- `task_manager.py` - TaskManager class for CRUD operations and persistence
- `todo_cli.py` - Command-line interface and main application entry point
- `tasks.json` - JSON file for data persistence (created automatically)
- `README.md` - This documentation file
