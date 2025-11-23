"""
Task Manager API - Main application file.
Refactored to follow SOLID principles with service layer separation.
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

from config import get_config
from services import TaskService
from monitoring import metrics_collector, track_metrics

# Initialize Flask app with configuration
config = get_config()
app = Flask(__name__)
app.config.from_object(config)
CORS(app, origins=config.CORS_ORIGINS)

# Initialize task service
task_service = TaskService(config.DATA_PATH)

@app.route('/')
@track_metrics
def index():
    """Root endpoint - API information."""
    return jsonify({
        'name': config.APP_NAME,
        'version': config.APP_VERSION,
        'status': 'running'
    })


@app.route('/health')
def health_check():
    """
    Health check endpoint for monitoring and load balancers.
    Returns basic application status information.
    """
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': config.APP_VERSION,
        'service': config.APP_NAME
    }), 200


@app.route('/metrics')
def metrics():
    """
    Metrics endpoint exposing application performance data.
    Includes request counts, latencies, error rates, and per-endpoint statistics.
    """
    if not config.ENABLE_METRICS:
        return jsonify({'error': 'Metrics disabled'}), 403
    
    return jsonify(metrics_collector.get_metrics_summary()), 200


# Create a new task
@app.route('/tasks', methods=['POST'])
@track_metrics
def create_task():
    """Create a new task."""
    try:
        data = request.json
        if not data or 'title' not in data:
            return jsonify({'error': 'Title is required'}), 400
        
        task = task_service.create_task(
            title=data.get('title'),
            description=data.get('description'),
            due_date=data.get('due_date'),
            status=data.get('status', 'pending')
        )
        return jsonify(task), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500


# Get all tasks
@app.route('/tasks', methods=['GET'])
@track_metrics
def get_tasks():
    """Retrieve all tasks."""
    try:
        tasks = task_service.get_all_tasks()
        return jsonify(tasks), 200
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500


# Update a task
@app.route('/tasks/<int:task_id>', methods=['PUT'])
@track_metrics
def update_task(task_id):
    """Update an existing task."""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        task = task_service.update_task(
            task_id=task_id,
            title=data.get('title'),
            description=data.get('description'),
            due_date=data.get('due_date'),
            status=data.get('status')
        )
        
        if task is None:
            return jsonify({'error': 'Task not found'}), 404
        
        return jsonify(task), 200
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500


# Delete a task
@app.route('/tasks/<int:task_id>', methods=['DELETE'])
@track_metrics
def delete_task(task_id):
    """Delete a task."""
    try:
        deleted = task_service.delete_task(task_id)
        if not deleted:
            return jsonify({'error': 'Task not found'}), 404
        return '', 204
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    # Run the application with configuration from config.py
    # Settings can be overridden via environment variables
    app.run(
        host=config.HOST,
        port=config.PORT,
        debug=config.DEBUG,
        use_reloader=False  # Avoid duplicate processes when launched via scripts
    )
