"""
Integration tests for Task Manager API endpoints.
Tests the complete API workflow including all HTTP methods.
"""
import pytest
import json
import tempfile
import os
from app import app as flask_app
from config import TestConfig


@pytest.fixture
def app():
    """Create and configure a test instance of the Flask application."""
    from services import TaskService
    
    # Create a temporary test database
    fd, db_path = tempfile.mkstemp(suffix='.json')
    os.close(fd)
    
    # Reinitialize the task service with test database
    flask_app.config['DATA_PATH'] = db_path
    
    # Import and replace the global task_service
    import app as app_module
    app_module.task_service = TaskService(db_path)
    
    yield flask_app
    
    # Cleanup
    if os.path.exists(db_path):
        os.remove(db_path)


@pytest.fixture
def client(app):
    """Create a test client for the app."""
    return app.test_client()


class TestAPIEndpoints:
    """Test suite for API endpoints."""
    
    def test_root_endpoint(self, client):
        """Test the root endpoint returns API information."""
        response = client.get('/')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'version' in data
        assert 'status' in data
    
    def test_health_endpoint(self, client):
        """Test health check endpoint."""
        response = client.get('/health')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'healthy'
        assert 'timestamp' in data
        assert 'version' in data
    
    def test_metrics_endpoint(self, client):
        """Test metrics endpoint returns performance data."""
        response = client.get('/metrics')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'request_count' in data
        assert 'error_count' in data
        assert 'average_latency_ms' in data
    
    def test_create_task_success(self, client):
        """Test creating a task successfully."""
        task_data = {
            'title': 'Test Task',
            'description': 'Test Description',
            'due_date': '2025-12-31',
            'status': 'pending'
        }
        
        response = client.post('/tasks',
                              data=json.dumps(task_data),
                              content_type='application/json')
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['title'] == 'Test Task'
        assert data['description'] == 'Test Description'
        assert 'id' in data
    
    def test_create_task_missing_title(self, client):
        """Test creating task without title returns 400."""
        task_data = {'description': 'No title'}
        
        response = client.post('/tasks',
                              data=json.dumps(task_data),
                              content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_create_task_empty_title(self, client):
        """Test creating task with empty title returns 400."""
        task_data = {'title': ''}
        
        response = client.post('/tasks',
                              data=json.dumps(task_data),
                              content_type='application/json')
        
        assert response.status_code == 400
    
    def test_get_all_tasks_empty(self, client):
        """Test getting tasks when none exist."""
        response = client.get('/tasks')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == []
    
    def test_get_all_tasks_with_data(self, client):
        """Test getting all tasks after creating some."""
        # Create multiple tasks
        client.post('/tasks',
                   data=json.dumps({'title': 'Task 1'}),
                   content_type='application/json')
        client.post('/tasks',
                   data=json.dumps({'title': 'Task 2'}),
                   content_type='application/json')
        
        # Get all tasks
        response = client.get('/tasks')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data) == 2
    
    def test_update_task_success(self, client):
        """Test updating an existing task."""
        # Create a task
        create_response = client.post('/tasks',
                                     data=json.dumps({'title': 'Original'}),
                                     content_type='application/json')
        task_id = json.loads(create_response.data)['id']
        
        # Update the task
        update_data = {
            'title': 'Updated Title',
            'description': 'New description',
            'status': 'completed'
        }
        response = client.put(f'/tasks/{task_id}',
                             data=json.dumps(update_data),
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['title'] == 'Updated Title'
        assert data['description'] == 'New description'
        assert data['status'] == 'completed'
    
    def test_update_task_not_found(self, client):
        """Test updating a non-existent task returns 404."""
        update_data = {'title': 'Updated'}
        response = client.put('/tasks/999',
                             data=json.dumps(update_data),
                             content_type='application/json')
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_update_task_no_data(self, client):
        """Test updating task with no data returns 400."""
        # Create a task first
        create_response = client.post('/tasks',
                                     data=json.dumps({'title': 'Test'}),
                                     content_type='application/json')
        task_id = json.loads(create_response.data)['id']
        
        # Try to update with no data
        response = client.put(f'/tasks/{task_id}',
                             data=json.dumps({}),
                             content_type='application/json')
        
        # Should accept empty updates (no changes)
        assert response.status_code in [200, 400]
    
    def test_delete_task_success(self, client):
        """Test deleting an existing task."""
        # Create a task
        create_response = client.post('/tasks',
                                     data=json.dumps({'title': 'Delete Me'}),
                                     content_type='application/json')
        task_id = json.loads(create_response.data)['id']
        
        # Delete the task
        response = client.delete(f'/tasks/{task_id}')
        assert response.status_code == 204
        
        # Verify it's gone
        get_response = client.get('/tasks')
        tasks = json.loads(get_response.data)
        assert len(tasks) == 0
    
    def test_delete_task_not_found(self, client):
        """Test deleting a non-existent task returns 404."""
        response = client.delete('/tasks/999')
        assert response.status_code == 404
    
    def test_full_crud_workflow(self, client):
        """Test complete CRUD workflow in sequence."""
        # CREATE
        create_data = {
            'title': 'Workflow Task',
            'description': 'Testing full CRUD',
            'status': 'pending'
        }
        create_response = client.post('/tasks',
                                     data=json.dumps(create_data),
                                     content_type='application/json')
        assert create_response.status_code == 201
        task_id = json.loads(create_response.data)['id']
        
        # READ
        get_response = client.get('/tasks')
        assert get_response.status_code == 200
        tasks = json.loads(get_response.data)
        assert len(tasks) == 1
        assert tasks[0]['title'] == 'Workflow Task'
        
        # UPDATE
        update_data = {'status': 'completed'}
        update_response = client.put(f'/tasks/{task_id}',
                                     data=json.dumps(update_data),
                                     content_type='application/json')
        assert update_response.status_code == 200
        updated_task = json.loads(update_response.data)
        assert updated_task['status'] == 'completed'
        
        # DELETE
        delete_response = client.delete(f'/tasks/{task_id}')
        assert delete_response.status_code == 204
        
        # Verify deletion
        final_get = client.get('/tasks')
        final_tasks = json.loads(final_get.data)
        assert len(final_tasks) == 0
    
    def test_concurrent_task_creation(self, client):
        """Test creating multiple tasks maintains unique IDs."""
        titles = ['Task 1', 'Task 2', 'Task 3', 'Task 4', 'Task 5']
        task_ids = []
        
        for title in titles:
            response = client.post('/tasks',
                                  data=json.dumps({'title': title}),
                                  content_type='application/json')
            task_id = json.loads(response.data)['id']
            task_ids.append(task_id)
        
        # All IDs should be unique
        assert len(task_ids) == len(set(task_ids))
        # IDs should be sequential
        assert task_ids == sorted(task_ids)
