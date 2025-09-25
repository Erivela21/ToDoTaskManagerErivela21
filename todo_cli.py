#!/usr/bin/env python3
"""
Command-line interface for the To-Do List Manager application.
"""
import sys
from typing import List
from task_manager import TaskManager


class TodoCLI:
    """Command-line interface for the To-Do List Manager."""
    
    def __init__(self):
        """Initialize the CLI with a TaskManager instance."""
        self.task_manager = TaskManager()
    
    def print_help(self):
        """Print help information."""
        help_text = """
To-Do List Manager - Available Commands:

  add <title> [description] [priority]    - Add a new task
  list [all|pending|completed]            - List tasks (default: all)
  show <id>                               - Show detailed task information
  update <id> [title] [description] [priority] - Update a task
  complete <id>                           - Mark task as completed
  uncomplete <id>                         - Mark task as incomplete
  delete <id>                             - Delete a task
  stats                                   - Show task statistics
  help                                    - Show this help message
  exit                                    - Exit the application

Priority levels: low, medium, high (default: medium)

Examples:
  add "Buy groceries" "Milk, bread, eggs" high
  list pending
  complete 1
  update 2 "Buy organic groceries" "" low
        """
        print(help_text)
    
    def add_task(self, args: List[str]):
        """Add a new task."""
        if not args:
            print("Error: Task title is required")
            return
        
        title = args[0]
        description = args[1] if len(args) > 1 else ""
        priority = args[2] if len(args) > 2 else "medium"
        
        if priority.lower() not in ['low', 'medium', 'high']:
            print(f"Warning: Invalid priority '{priority}', using 'medium'")
            priority = "medium"
        
        task = self.task_manager.create_task(title, description, priority)
        print(f"Task created: {task}")
    
    def list_tasks(self, args: List[str]):
        """List tasks based on filter."""
        filter_type = args[0].lower() if args else "all"
        
        if filter_type == "all":
            tasks = self.task_manager.get_all_tasks()
            title = "All Tasks"
        elif filter_type == "pending":
            tasks = self.task_manager.get_tasks_by_status(False)
            title = "Pending Tasks"
        elif filter_type == "completed":
            tasks = self.task_manager.get_tasks_by_status(True)
            title = "Completed Tasks"
        else:
            print(f"Error: Invalid filter '{filter_type}'. Use: all, pending, or completed")
            return
        
        print(f"\n{title}:")
        print("-" * 40)
        
        if not tasks:
            print("No tasks found.")
        else:
            # Sort tasks by priority (high -> medium -> low) and then by ID
            priority_order = {'high': 0, 'medium': 1, 'low': 2}
            tasks.sort(key=lambda t: (priority_order[t.priority], t.id))
            
            for task in tasks:
                print(task)
        print()
    
    def show_task(self, args: List[str]):
        """Show detailed information about a task."""
        if not args:
            print("Error: Task ID is required")
            return
        
        try:
            task_id = int(args[0])
        except ValueError:
            print("Error: Task ID must be a number")
            return
        
        task = self.task_manager.get_task(task_id)
        if task:
            print(f"\nTask Details:")
            print("-" * 40)
            print(task.detailed_str())
            print()
        else:
            print(f"Error: Task with ID {task_id} not found")
    
    def update_task(self, args: List[str]):
        """Update a task."""
        if not args:
            print("Error: Task ID is required")
            return
        
        try:
            task_id = int(args[0])
        except ValueError:
            print("Error: Task ID must be a number")
            return
        
        title = args[1] if len(args) > 1 and args[1] else None
        description = args[2] if len(args) > 2 else None
        priority = args[3] if len(args) > 3 and args[3] else None
        
        if priority and priority.lower() not in ['low', 'medium', 'high']:
            print(f"Error: Invalid priority '{priority}'. Use: low, medium, or high")
            return
        
        if self.task_manager.update_task(task_id, title, description, priority):
            updated_task = self.task_manager.get_task(task_id)
            print(f"Task updated: {updated_task}")
        else:
            print(f"Error: Task with ID {task_id} not found")
    
    def complete_task(self, args: List[str]):
        """Mark a task as completed."""
        if not args:
            print("Error: Task ID is required")
            return
        
        try:
            task_id = int(args[0])
        except ValueError:
            print("Error: Task ID must be a number")
            return
        
        if self.task_manager.complete_task(task_id):
            task = self.task_manager.get_task(task_id)
            print(f"Task completed: {task}")
        else:
            print(f"Error: Task with ID {task_id} not found")
    
    def uncomplete_task(self, args: List[str]):
        """Mark a task as incomplete."""
        if not args:
            print("Error: Task ID is required")
            return
        
        try:
            task_id = int(args[0])
        except ValueError:
            print("Error: Task ID must be a number")
            return
        
        if self.task_manager.uncomplete_task(task_id):
            task = self.task_manager.get_task(task_id)
            print(f"Task marked as incomplete: {task}")
        else:
            print(f"Error: Task with ID {task_id} not found")
    
    def delete_task(self, args: List[str]):
        """Delete a task."""
        if not args:
            print("Error: Task ID is required")
            return
        
        try:
            task_id = int(args[0])
        except ValueError:
            print("Error: Task ID must be a number")
            return
        
        # Get task info before deleting for confirmation
        task = self.task_manager.get_task(task_id)
        if not task:
            print(f"Error: Task with ID {task_id} not found")
            return
        
        if self.task_manager.delete_task(task_id):
            print(f"Task deleted: {task.title}")
        else:
            print(f"Error: Could not delete task with ID {task_id}")
    
    def show_stats(self):
        """Show task statistics."""
        stats = self.task_manager.get_task_count()
        
        print(f"\nTask Statistics:")
        print("-" * 40)
        print(f"Total Tasks: {stats['total']}")
        print(f"Completed: {stats['completed']}")
        print(f"Pending: {stats['pending']}")
        print(f"\nBy Priority:")
        print(f"  High: {stats['priority']['high']}")
        print(f"  Medium: {stats['priority']['medium']}")
        print(f"  Low: {stats['priority']['low']}")
        print()
    
    def parse_command(self, command_line: str):
        """Parse and execute a command."""
        parts = []
        current_part = ""
        in_quotes = False
        
        # Simple quote parsing to handle titles/descriptions with spaces
        for char in command_line:
            if char == '"' and not in_quotes:
                in_quotes = True
            elif char == '"' and in_quotes:
                in_quotes = False
                if current_part:
                    parts.append(current_part)
                    current_part = ""
            elif char == ' ' and not in_quotes:
                if current_part:
                    parts.append(current_part)
                    current_part = ""
            else:
                current_part += char
        
        if current_part:
            parts.append(current_part)
        
        if not parts:
            return
        
        command = parts[0].lower()
        args = parts[1:]
        
        if command == "add":
            self.add_task(args)
        elif command == "list":
            self.list_tasks(args)
        elif command == "show":
            self.show_task(args)
        elif command == "update":
            self.update_task(args)
        elif command == "complete":
            self.complete_task(args)
        elif command == "uncomplete":
            self.uncomplete_task(args)
        elif command == "delete":
            self.delete_task(args)
        elif command == "stats":
            self.show_stats()
        elif command == "help":
            self.print_help()
        elif command == "exit":
            print("Goodbye!")
            sys.exit(0)
        else:
            print(f"Unknown command: {command}")
            print("Type 'help' for available commands")
    
    def run(self):
        """Run the interactive CLI."""
        print("Welcome to To-Do List Manager!")
        print("Type 'help' for available commands or 'exit' to quit.")
        print()
        
        while True:
            try:
                command = input("todo> ").strip()
                if command:
                    self.parse_command(command)
            except KeyboardInterrupt:
                print("\nGoodbye!")
                break
            except EOFError:
                print("\nGoodbye!")
                break


def main():
    """Main entry point."""
    cli = TodoCLI()
    
    # If command line arguments are provided, execute them and exit
    if len(sys.argv) > 1:
        # For command line usage, treat each argument as a separate parameter
        # This avoids quote parsing issues from the shell
        command = sys.argv[1]
        args = sys.argv[2:]
        
        if command == "add":
            cli.add_task(args)
        elif command == "list":
            cli.list_tasks(args)
        elif command == "show":
            cli.show_task(args)
        elif command == "update":
            cli.update_task(args)
        elif command == "complete":
            cli.complete_task(args)
        elif command == "uncomplete":
            cli.uncomplete_task(args)
        elif command == "delete":
            cli.delete_task(args)
        elif command == "stats":
            cli.show_stats()
        elif command == "help":
            cli.print_help()
        else:
            print(f"Unknown command: {command}")
            print("Type 'help' for available commands")
    else:
        # Otherwise, run interactive mode
        cli.run()


if __name__ == "__main__":
    main()