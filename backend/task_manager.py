from task import Task

class TaskManager:
    def __init__(self):
        self.tasks = []

    def add_task(self, task):
        self.tasks.append(task)

    def get_tasks(self):
        return self.tasks

    def update_task(self, task_id, **kwargs):
        pass  # Placeholder

    def delete_task(self, task_id):
        pass  # Placeholder
