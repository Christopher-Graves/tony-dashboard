import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const TASKS_FILE = join(process.cwd(), 'data', 'tasks.json');

interface Task {
  id: string;
  title: string;
  status: 'backlog' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

function getTasks(): Task[] {
  try {
    if (!existsSync(TASKS_FILE)) {
      return [];
    }
    const data = readFileSync(TASKS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading tasks file:', error);
    return [];
  }
}

function saveTasks(tasks: Task[]) {
  try {
    const dir = join(process.cwd(), 'data');
    if (!existsSync(dir)) {
      require('fs').mkdirSync(dir, { recursive: true });
    }
    writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
  } catch (error) {
    console.error('Error saving tasks:', error);
    throw error;
  }
}

export async function GET() {
  try {
    const tasks = getTasks();
    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const task: Task = await request.json();
    const tasks = getTasks();
    
    task.id = task.id || `task-${Date.now()}`;
    task.createdAt = task.createdAt || new Date().toISOString();
    task.updatedAt = new Date().toISOString();
    
    tasks.push(task);
    saveTasks(tasks);
    
    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const updatedTask: Task = await request.json();
    const tasks = getTasks();
    
    const index = tasks.findIndex(t => t.id === updatedTask.id);
    if (index === -1) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    tasks[index] = { ...updatedTask, updatedAt: new Date().toISOString() };
    saveTasks(tasks);
    
    return NextResponse.json(tasks[index]);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    const tasks = getTasks();
    
    const filtered = tasks.filter(t => t.id !== id);
    saveTasks(filtered);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
