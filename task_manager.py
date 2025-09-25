"""
TaskManager class for managing a collection of tasks.
"""
import json
import os
from typing import List, Optional
from task import Task


class TaskManager:
    """
    Manages a collection of tasks with CRUD operations and persistence.
    """
    
    def __init__(self, data_file: str = "tasks.json"):
        """
        Initialize the task manager.
        
        Args:
            data_file (str): Path to the JSON file for data persistence
        """
        self.data_file = data_file
        self.tasks: List[Task] = []
        self.next_id = 1
        self.load_tasks()
    
    def load_tasks(self):
        """Load tasks from the JSON file."""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r') as f:
                    data = json.load(f)
                    self.tasks = [Task.from_dict(task_data) for task_data in data.get('tasks', [])]
                    self.next_id = data.get('next_id', 1)
            except (json.JSONDecodeError, FileNotFoundError):
                self.tasks = []
                self.next_id = 1
    
    def save_tasks(self):
        """Save tasks to the JSON file."""
        data = {
            'tasks': [task.to_dict() for task in self.tasks],
            'next_id': self.next_id
        }
        with open(self.data_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    def create_task(self, title: str, description: str = "", priority: str = "medium") -> Task:
        """
        Create a new task.
        
        Args:
            title (str): Task title
            description (str): Task description
            priority (str): Task priority ('low', 'medium', 'high')
            
        Returns:
            Task: The created task
        """
        task = Task(title, description, priority)
        task.id = self.next_id
        self.next_id += 1
        self.tasks.append(task)
        self.save_tasks()
        return task
    
    def get_task(self, task_id: int) -> Optional[Task]:
        """
        Get a task by ID.
        
        Args:
            task_id (int): The task ID
            
        Returns:
            Task or None: The task if found, None otherwise
        """
        for task in self.tasks:
            if task.id == task_id:
                return task
        return None
    
    def get_all_tasks(self) -> List[Task]:
        """
        Get all tasks.
        
        Returns:
            List[Task]: List of all tasks
        """
        return self.tasks.copy()
    
    def get_tasks_by_status(self, completed: bool) -> List[Task]:
        """
        Get tasks filtered by completion status.
        
        Args:
            completed (bool): True for completed tasks, False for pending tasks
            
        Returns:
            List[Task]: Filtered list of tasks
        """
        return [task for task in self.tasks if task.completed == completed]
    
    def get_tasks_by_priority(self, priority: str) -> List[Task]:
        """
        Get tasks filtered by priority.
        
        Args:
            priority (str): Priority level ('low', 'medium', 'high')
            
        Returns:
            List[Task]: Filtered list of tasks
        """
        return [task for task in self.tasks if task.priority == priority.lower()]
    
    def update_task(self, task_id: int, title: str = None, description: str = None, 
                   priority: str = None) -> bool:
        """
        Update a task.
        
        Args:
            task_id (int): The task ID
            title (str): New title (optional)
            description (str): New description (optional)
            priority (str): New priority (optional)
            
        Returns:
            bool: True if task was updated, False if task not found
        """
        task = self.get_task(task_id)
        if task:
            task.update(title, description, priority)
            self.save_tasks()
            return True
        return False
    
    def complete_task(self, task_id: int) -> bool:
        """
        Mark a task as completed.
        
        Args:
            task_id (int): The task ID
            
        Returns:
            bool: True if task was marked complete, False if task not found
        """
        task = self.get_task(task_id)
        if task:
            task.mark_completed()
            self.save_tasks()
            return True
        return False
    
    def uncomplete_task(self, task_id: int) -> bool:
        """
        Mark a task as incomplete.
        
        Args:
            task_id (int): The task ID
            
        Returns:
            bool: True if task was marked incomplete, False if task not found
        """
        task = self.get_task(task_id)
        if task:
            task.mark_incomplete()
            self.save_tasks()
            return True
        return False
    
    def delete_task(self, task_id: int) -> bool:
        """
        Delete a task.
        
        Args:
            task_id (int): The task ID
            
        Returns:
            bool: True if task was deleted, False if task not found
        """
        for i, task in enumerate(self.tasks):
            if task.id == task_id:
                del self.tasks[i]
                self.save_tasks()
                return True
        return False
    
    def get_task_count(self) -> dict:
        """
        Get task statistics.
        
        Returns:
            dict: Dictionary with task counts by status and priority
        """
        total = len(self.tasks)
        completed = len([t for t in self.tasks if t.completed])
        pending = total - completed
        
        priority_counts = {
            'high': len([t for t in self.tasks if t.priority == 'high']),
            'medium': len([t for t in self.tasks if t.priority == 'medium']),
            'low': len([t for t in self.tasks if t.priority == 'low'])
        }
        
        return {
            'total': total,
            'completed': completed,
            'pending': pending,
            'priority': priority_counts
        }