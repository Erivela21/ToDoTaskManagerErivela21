
const API_URL = 'http://127.0.0.1:5000/tasks';

async function fetchTasks() {
	const res = await fetch(API_URL);
	const tasks = await res.json();
	renderTasks(tasks);
}

async function addTask() {
	const title = document.getElementById('title').value;
	const description = document.getElementById('description').value;
	const due_date = document.getElementById('due_date').value;
	const status = document.getElementById('status').value;
	if (!title) return alert('Title is required');
	await fetch(API_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ title, description, due_date, status })
	});
	clearForm();
	fetchTasks();
}

async function deleteTask(id) {
	await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
	fetchTasks();
}

async function updateTask(id) {
	const title = prompt('New title:');
	if (!title) return;
	await fetch(`${API_URL}/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ title })
	});
	fetchTasks();
}

function renderTasks(tasks) {
	const list = document.getElementById('task-list');
	if (!tasks.length) {
		list.innerHTML = '<p>No tasks yet.</p>';
		return;
	}
	list.innerHTML = '<ul>' + tasks.map(task => `
		<li>
			<b>${task.title}</b> (Due: ${task.due_date || 'N/A'}) [${task.status}]
			<button onclick="updateTask(${task.id})">Edit</button>
			<button onclick="deleteTask(${task.id})">Delete</button>
			<br><small>${task.description || ''}</small>
		</li>
	`).join('') + '</ul>';
}

function clearForm() {
	document.getElementById('title').value = '';
	document.getElementById('description').value = '';
	document.getElementById('due_date').value = '';
	document.getElementById('status').value = 'pending';
}

window.onload = fetchTasks;
