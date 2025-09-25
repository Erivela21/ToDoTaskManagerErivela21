"""
Task class for the To-Do List Manager application.
"""
from datetime import datetime
from typing import Optional


class Task:
    """
    Represents a single task in the to-do list.
    """
    
    def __init__(self, title: str, description: str = "", priority: str = "medium"):
        """
        Initialize a new task.
        
        Args:
            title (str): The title of the task
            description (str): Optional description of the task
            priority (str): Priority level ('low', 'medium', 'high')
        """
        self.id: Optional[int] = None
        self.title = title
        self.description = description
        self.priority = priority.lower()
        self.completed = False
        self.created_at = datetime.now().isoformat()
        self.updated_at = self.created_at
        
        # Validate priority
        if self.priority not in ['low', 'medium', 'high']:
            self.priority = 'medium'
    
    def mark_completed(self):
        """Mark the task as completed."""
        self.completed = True
        self.updated_at = datetime.now().isoformat()
    
    def mark_incomplete(self):
        """Mark the task as incomplete."""
        self.completed = False
        self.updated_at = datetime.now().isoformat()
    
    def update(self, title: str = None, description: str = None, priority: str = None):
        """
        Update task properties.
        
        Args:
            title (str): New title (optional)
            description (str): New description (optional)
            priority (str): New priority (optional)
        """
        if title is not None:
            self.title = title
        if description is not None:
            self.description = description
        if priority is not None:
            priority = priority.lower()
            if priority in ['low', 'medium', 'high']:
                self.priority = priority
        
        self.updated_at = datetime.now().isoformat()
    
    def to_dict(self) -> dict:
        """Convert task to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'priority': self.priority,
            'completed': self.completed,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Task':
        """Create task from dictionary (JSON deserialization)."""
        task = cls(
            title=data['title'],
            description=data.get('description', ''),
            priority=data.get('priority', 'medium')
        )
        task.id = data.get('id')
        task.completed = data.get('completed', False)
        task.created_at = data.get('created_at', datetime.now().isoformat())
        task.updated_at = data.get('updated_at', task.created_at)
        return task
    
    def __str__(self) -> str:
        """String representation of the task."""
        status = "✓" if self.completed else "○"
        priority_symbol = {"low": "↓", "medium": "→", "high": "↑"}[self.priority]
        return f"[{self.id}] {status} {priority_symbol} {self.title}"
    
    def detailed_str(self) -> str:
        """Detailed string representation of the task."""
        status = "Completed" if self.completed else "Pending"
        lines = [
            f"ID: {self.id}",
            f"Title: {self.title}",
            f"Description: {self.description}",
            f"Priority: {self.priority.capitalize()}",
            f"Status: {status}",
            f"Created: {self.created_at[:19].replace('T', ' ')}",
            f"Updated: {self.updated_at[:19].replace('T', ' ')}"
        ]
        return '\n'.join(lines)