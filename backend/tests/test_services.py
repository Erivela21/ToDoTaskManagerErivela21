"""
Unit tests for TaskService class.
Tests all business logic operations following AAA pattern (Arrange, Act, Assert).
"""
import pytest
import os
import json
import tempfile
from services import TaskService


class TestTaskService:
    """Test suite for TaskService class."""
    
    @pytest.fixture
    def temp_data_file(self):
        """Create a temporary file for testing."""
        fd, path = tempfile.mkstemp(suffix='.json')
        os.close(fd)
        yield path
        # Cleanup
        if os.path.exists(path):
            os.remove(path)
    
    @pytest.fixture
    def task_service(self, temp_data_file):
        """Create a TaskService instance with temporary file."""
        return TaskService(temp_data_file)
    
    def test_load_tasks_empty_file(self, task_service):
        """Test loading tasks from non-existent file returns empty list."""
        tasks = task_service.load_tasks()
        assert tasks == []
    
    def test_save_and_load_tasks(self, task_service):
        """Test saving tasks and loading them back."""
        test_tasks = [
            {'id': 1, 'title': 'Test Task', 'status': 'pending'},
            {'id': 2, 'title': 'Another Task', 'status': 'completed'}
        ]
        task_service.save_tasks(test_tasks)
        loaded_tasks = task_service.load_tasks()
        assert loaded_tasks == test_tasks
    
    def test_get_next_id_empty_list(self, task_service):
        """Test get_next_id returns 1 for empty task list."""
        assert task_service.get_next_id([]) == 1
    
    def test_get_next_id_with_tasks(self, task_service):
        """Test get_next_id returns max ID + 1."""
        tasks = [
            {'id': 1, 'title': 'Task 1'},
            {'id': 5, 'title': 'Task 5'},
            {'id': 3, 'title': 'Task 3'}
        ]
        assert task_service.get_next_id(tasks) == 6
    
    def test_create_task_basic(self, task_service):
        """Test creating a task with minimal data."""
        task = task_service.create_task(title='New Task')
        assert task['id'] == 1
        assert task['title'] == 'New Task'
        assert task['status'] == 'pending'
        assert task['description'] is None
        assert task['due_date'] is None
    
    def test_create_task_full_data(self, task_service):
        """Test creating a task with all fields."""
        task = task_service.create_task(
            title='Complete Task',
            description='Task description',
            due_date='2025-12-31',
            status='pending'
        )
        assert task['title'] == 'Complete Task'
        assert task['description'] == 'Task description'
        assert task['due_date'] == '2025-12-31'
        assert task['status'] == 'pending'
    
    def test_create_task_empty_title_raises_error(self, task_service):
        """Test that creating task with empty title raises ValueError."""
        with pytest.raises(ValueError, match="Task title is required"):
            task_service.create_task(title='')
        
        with pytest.raises(ValueError, match="Task title is required"):
            task_service.create_task(title='   ')
    
    def test_create_task_none_title_raises_error(self, task_service):
        """Test that creating task with None title raises ValueError."""
        with pytest.raises(ValueError, match="Task title is required"):
            task_service.create_task(title=None)
    
    def test_create_task_increments_id(self, task_service):
        """Test that multiple tasks get incrementing IDs."""
        task1 = task_service.create_task(title='Task 1')
        task2 = task_service.create_task(title='Task 2')
        task3 = task_service.create_task(title='Task 3')
        
        assert task1['id'] == 1
        assert task2['id'] == 2
        assert task3['id'] == 3
    
    def test_get_all_tasks(self, task_service):
        """Test retrieving all tasks."""
        task_service.create_task(title='Task 1')
        task_service.create_task(title='Task 2')
        
        tasks = task_service.get_all_tasks()
        assert len(tasks) == 2
        assert tasks[0]['title'] == 'Task 1'
        assert tasks[1]['title'] == 'Task 2'
    
    def test_get_task_by_id_exists(self, task_service):
        """Test getting an existing task by ID."""
        created_task = task_service.create_task(title='Find Me')
        found_task = task_service.get_task_by_id(created_task['id'])
        
        assert found_task is not None
        assert found_task['id'] == created_task['id']
        assert found_task['title'] == 'Find Me'
    
    def test_get_task_by_id_not_exists(self, task_service):
        """Test getting a non-existent task returns None."""
        task = task_service.get_task_by_id(999)
        assert task is None
    
    def test_update_task_all_fields(self, task_service):
        """Test updating all fields of a task."""
        created_task = task_service.create_task(title='Original Title')
        
        updated_task = task_service.update_task(
            task_id=created_task['id'],
            title='Updated Title',
            description='Updated Description',
            due_date='2025-12-31',
            status='completed'
        )
        
        assert updated_task is not None
        assert updated_task['title'] == 'Updated Title'
        assert updated_task['description'] == 'Updated Description'
        assert updated_task['due_date'] == '2025-12-31'
        assert updated_task['status'] == 'completed'
    
    def test_update_task_partial_fields(self, task_service):
        """Test updating only some fields preserves others."""
        created_task = task_service.create_task(
            title='Original',
            description='Original Description'
        )
        
        updated_task = task_service.update_task(
            task_id=created_task['id'],
            title='New Title'
        )
        
        assert updated_task['title'] == 'New Title'
        assert updated_task['description'] == 'Original Description'
    
    def test_update_nonexistent_task(self, task_service):
        """Test updating a non-existent task returns None."""
        result = task_service.update_task(task_id=999, title='New Title')
        assert result is None
    
    def test_delete_task_exists(self, task_service):
        """Test deleting an existing task."""
        created_task = task_service.create_task(title='Delete Me')
        
        deleted = task_service.delete_task(created_task['id'])
        assert deleted is True
        
        # Verify it's gone
        task = task_service.get_task_by_id(created_task['id'])
        assert task is None
    
    def test_delete_task_not_exists(self, task_service):
        """Test deleting a non-existent task returns False."""
        deleted = task_service.delete_task(999)
        assert deleted is False
    
    def test_get_tasks_by_status(self, task_service):
        """Test filtering tasks by status."""
        task_service.create_task(title='Pending 1', status='pending')
        task_service.create_task(title='Completed 1', status='completed')
        task_service.create_task(title='Pending 2', status='pending')
        
        pending_tasks = task_service.get_tasks_by_status('pending')
        completed_tasks = task_service.get_tasks_by_status('completed')
        
        assert len(pending_tasks) == 2
        assert len(completed_tasks) == 1
        assert all(t['status'] == 'pending' for t in pending_tasks)
    
    def test_get_task_statistics(self, task_service):
        """Test getting task statistics."""
        task_service.create_task(title='Task 1', status='pending')
        task_service.create_task(title='Task 2', status='completed')
        task_service.create_task(title='Task 3', status='pending')
        task_service.create_task(title='Task 4', status='completed')
        
        stats = task_service.get_task_statistics()
        
        assert stats['total'] == 4
        assert stats['pending'] == 2
        assert stats['completed'] == 2
    
    def test_persistence_across_instances(self, temp_data_file):
        """Test that data persists across service instances."""
        # Create task with first instance
        service1 = TaskService(temp_data_file)
        task = service1.create_task(title='Persistent Task')
        
        # Create new instance and verify task exists
        service2 = TaskService(temp_data_file)
        found_task = service2.get_task_by_id(task['id'])
        
        assert found_task is not None
        assert found_task['title'] == 'Persistent Task'
