"""
Service layer for Task Manager application.
Implements business logic separated from API routes (SOLID principles).
"""
import json
import os
from typing import List, Dict, Optional


class TaskService:
    """Service class handling all task-related business logic."""
    
    def __init__(self, data_path: str):
        """
        Initialize the TaskService with a data file path.
        
        Args:
            data_path: Path to the JSON file storing tasks
        """
        self.data_path = data_path
    
    def load_tasks(self) -> List[Dict]:
        """
        Load tasks from the data file.
        
        Returns:
            List of task dictionaries
        """
        if not os.path.exists(self.data_path):
            return []
        
        try:
            with open(self.data_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return []
    
    def save_tasks(self, tasks: List[Dict]) -> None:
        """
        Save tasks to the data file.
        
        Args:
            tasks: List of task dictionaries to save
        """
        with open(self.data_path, 'w', encoding='utf-8') as f:
            json.dump(tasks, f, indent=2)
    
    def get_next_id(self, tasks: List[Dict]) -> int:
        """
        Calculate the next available task ID.
        
        Args:
            tasks: Current list of tasks
            
        Returns:
            Next available integer ID
        """
        if not tasks:
            return 1
        return max(task['id'] for task in tasks) + 1
    
    def create_task(self, title: str, description: str = None, 
                   due_date: str = None, status: str = 'pending') -> Dict:
        """
        Create a new task.
        
        Args:
            title: Task title (required)
            description: Task description (optional)
            due_date: Due date in YYYY-MM-DD format (optional)
            status: Task status, defaults to 'pending'
            
        Returns:
            Created task dictionary
            
        Raises:
            ValueError: If title is empty or None
        """
        if not title or not title.strip():
            raise ValueError("Task title is required")
        
        tasks = self.load_tasks()
        task = {
            'id': self.get_next_id(tasks),
            'title': title.strip(),
            'description': description.strip() if description else None,
            'due_date': due_date,
            'status': status
        }
        tasks.append(task)
        self.save_tasks(tasks)
        return task
    
    def get_all_tasks(self) -> List[Dict]:
        """
        Retrieve all tasks.
        
        Returns:
            List of all task dictionaries
        """
        return self.load_tasks()
    
    def get_task_by_id(self, task_id: int) -> Optional[Dict]:
        """
        Retrieve a specific task by ID.
        
        Args:
            task_id: ID of the task to retrieve
            
        Returns:
            Task dictionary if found, None otherwise
        """
        tasks = self.load_tasks()
        for task in tasks:
            if task['id'] == task_id:
                return task
        return None
    
    def update_task(self, task_id: int, title: str = None, description: str = None,
                   due_date: str = None, status: str = None) -> Optional[Dict]:
        """
        Update an existing task.
        
        Args:
            task_id: ID of the task to update
            title: New title (optional)
            description: New description (optional)
            due_date: New due date (optional)
            status: New status (optional)
            
        Returns:
            Updated task dictionary if found, None otherwise
        """
        tasks = self.load_tasks()
        for task in tasks:
            if task['id'] == task_id:
                if title is not None:
                    task['title'] = title
                if description is not None:
                    task['description'] = description
                if due_date is not None:
                    task['due_date'] = due_date
                if status is not None:
                    task['status'] = status
                
                self.save_tasks(tasks)
                return task
        return None
    
    def delete_task(self, task_id: int) -> bool:
        """
        Delete a task by ID.
        
        Args:
            task_id: ID of the task to delete
            
        Returns:
            True if task was deleted, False if not found
        """
        tasks = self.load_tasks()
        original_length = len(tasks)
        new_tasks = [task for task in tasks if task['id'] != task_id]
        
        if len(new_tasks) < original_length:
            self.save_tasks(new_tasks)
            return True
        return False
    
    def get_tasks_by_status(self, status: str) -> List[Dict]:
        """
        Get all tasks with a specific status.
        
        Args:
            status: Status to filter by (e.g., 'pending', 'completed')
            
        Returns:
            List of tasks matching the status
        """
        tasks = self.load_tasks()
        return [task for task in tasks if task.get('status') == status]
    
    def get_task_statistics(self) -> Dict:
        """
        Get statistics about tasks.
        
        Returns:
            Dictionary with counts of tasks by status
        """
        tasks = self.load_tasks()
        return {
            'total': len(tasks),
            'pending': len([t for t in tasks if t.get('status') == 'pending']),
            'completed': len([t for t in tasks if t.get('status') == 'completed'])
        }
