import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('API: /api/tasks', () => {
  const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
  
  describe('GET /api/tasks', () => {
    it('should return array of tasks', async () => {
      const res = await fetch(`${BASE_URL}/api/tasks`);
      const data = await res.json();
      
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(data), 'Response should be an array');
    });

    it('should include required fields', async () => {
      const res = await fetch(`${BASE_URL}/api/tasks`);
      const tasks = await res.json();
      
      if (tasks.length > 0) {
        const task = tasks[0];
        assert.ok('id' in task, 'Task should have id');
        assert.ok('title' in task, 'Task should have title');
        assert.ok('status' in task, 'Task should have status');
      }
    });

    it('should filter by status', async () => {
      const res = await fetch(`${BASE_URL}/api/tasks?status=pending`);
      const data = await res.json();
      
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(data));
      
      if (data.length > 0) {
        data.forEach((task: any) => {
          assert.strictEqual(task.status, 'pending');
        });
      }
    });

    it('should filter by category', async () => {
      const res = await fetch(`${BASE_URL}/api/tasks?category=engineering`);
      const data = await res.json();
      
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(data));
      
      if (data.length > 0) {
        data.forEach((task: any) => {
          assert.strictEqual(task.category, 'engineering');
        });
      }
    });

    it('should filter by priority', async () => {
      const res = await fetch(`${BASE_URL}/api/tasks?priority=high`);
      const data = await res.json();
      
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(data));
      
      if (data.length > 0) {
        data.forEach((task: any) => {
          assert.strictEqual(task.priority, 'high');
        });
      }
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const newTask = {
        title: 'Test Task',
        description: 'Test description',
        category: 'engineering',
        status: 'backlog',
      };
      
      const res = await fetch(`${BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });
      
      assert.ok(res.status === 200 || res.status === 201);
      const data = await res.json();
      assert.ok('id' in data || 'success' in data);
    });

    it('should validate required fields', async () => {
      const res = await fetch(`${BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      assert.strictEqual(res.status, 400);
    });
  });

  describe('PUT /api/tasks', () => {
    it('should update task status', async () => {
      // First get a task ID
      const getRes = await fetch(`${BASE_URL}/api/tasks`);
      const tasks = await getRes.json();
      
      if (tasks.length > 0) {
        const taskId = tasks[0].id;
        const res = await fetch(`${BASE_URL}/api/tasks`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: taskId, status: 'done' }),
        });
        
        assert.ok(res.status === 200);
      }
    });
  });

  describe('DELETE /api/tasks', () => {
    it('should require task ID', async () => {
      const res = await fetch(`${BASE_URL}/api/tasks`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      assert.strictEqual(res.status, 400);
    });
  });
});
