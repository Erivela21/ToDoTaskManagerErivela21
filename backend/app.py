

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json

app = Flask(__name__)
CORS(app)

DATA_PATH = os.path.join(os.path.dirname(__file__), 'tasks.json')

def load_tasks():
    if not os.path.exists(DATA_PATH):
        return []
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except Exception:
            return []

def save_tasks(tasks):
    with open(DATA_PATH, 'w', encoding='utf-8') as f:
        json.dump(tasks, f, indent=2)


def get_next_id(tasks):
    if not tasks:
        return 1
    return max(task['id'] for task in tasks) + 1

@app.route('/')
def index():
    return 'To-Do List Manager API is running.'


# Create a new task
@app.route('/tasks', methods=['POST'])
def create_task():
    data = request.json
    tasks = load_tasks()
    task = {
        'id': get_next_id(tasks),
        'title': data.get('title'),
        'description': data.get('description'),
        'due_date': data.get('due_date'),
        'status': data.get('status', 'pending')
    }
    tasks.append(task)
    save_tasks(tasks)
    return jsonify(task), 201


# Get all tasks
@app.route('/tasks', methods=['GET'])
def get_tasks():
    tasks = load_tasks()
    return jsonify(tasks)


# Update a task
@app.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.json
    tasks = load_tasks()
    for task in tasks:
        if task['id'] == task_id:
            task['title'] = data.get('title', task['title'])
            task['description'] = data.get('description', task['description'])
            task['due_date'] = data.get('due_date', task['due_date'])
            task['status'] = data.get('status', task['status'])
            save_tasks(tasks)
            return jsonify(task)
    return jsonify({'error': 'Task not found'}), 404


# Delete a task
@app.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    tasks = load_tasks()
    new_tasks = [task for task in tasks if task['id'] != task_id]
    save_tasks(new_tasks)
    return '', 204


if __name__ == '__main__':
    app.run(debug=True)
