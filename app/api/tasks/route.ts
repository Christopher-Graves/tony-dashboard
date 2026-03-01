import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

const TASKS_FILE = join(homedir(), '.openclaw', 'workspace', 'tony-dashboard', 'data', 'tasks.json');

interface TaskNote {
  timestamp: string;
  author: string;
  text: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  category: string;          // agent ID
  status: 'backlog' | 'in-progress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  source: 'manual' | 'agent' | 'cron' | 'monitor';
  createdBy: string;
  assignedTo?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  notes: TaskNote[];
  tags: string[];
  linkedCron?: string | null;
  linkedSession?: string | null;
}

function normalizeStatus(status: string | undefined): string {
  switch (status) {
    case 'todo': return 'backlog';
    case 'dispatched': return 'in-progress';
    case 'blocked': return 'backlog';
    case 'in-progress': return 'in-progress';
    case 'done': return 'done';
    case 'cancelled': return 'cancelled';
    default: return 'backlog';
  }
}

function normalizeNotes(notes: any): TaskNote[] {
  if (!notes) return [];
  if (Array.isArray(notes)) {
    // Could be already-normalized TaskNote[] or string[]
    return notes.map((n: any) => {
      if (typeof n === 'string') return { timestamp: new Date().toISOString(), author: 'agent', text: n };
      return n;
    });
  }
  if (typeof notes === 'string' && notes.trim()) {
    return [{ timestamp: new Date().toISOString(), author: 'agent', text: notes }];
  }
  return [];
}

function getTasks(): any[] {
  try {
    if (!existsSync(TASKS_FILE)) return [];
    const raw = JSON.parse(readFileSync(TASKS_FILE, 'utf-8'));
    if (!Array.isArray(raw)) return [];
    return raw.map((t: any) => ({
      // Preserve ALL original fields (plan, findings, blockers, actions_taken, etc.)
      ...t,
      // Normalize to dashboard schema
      id: t.id,
      title: t.title || '',
      description: t.description || '',
      category: t.category || t.assignee || 'tony',
      status: normalizeStatus(t.status),
      _originalStatus: t.status, // Keep original for blocked detection
      blocked: t.status === 'blocked',
      priority: t.priority || 'medium',
      source: t.source || 'agent',
      createdBy: t.createdBy || 'tony',
      assignedTo: t.assignedTo || t.assignee || null,
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: t.updatedAt || t.createdAt || new Date().toISOString(),
      completedAt: t.completedAt || null,
      notes: normalizeNotes(t.notes),
      tags: t.tags || [],
      linkedCron: t.linkedCron || null,
      linkedSession: t.linkedSession || null,
    }));
  } catch (error) {
    console.error('[tasks] Error reading:', error);
    return [];
  }
}

function saveTasks(tasks: any[]) {
  const dir = dirname(TASKS_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

function generateId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    let tasks = getTasks();

    if (category) tasks = tasks.filter(t => t.category === category);
    if (status) tasks = tasks.filter(t => t.status === status);
    if (priority) tasks = tasks.filter(t => t.priority === priority);

    // Sort: critical first, then high, medium, low; within same priority, newest first
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    tasks.sort((a, b) => {
      const pd = (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
      if (pd !== 0) return pd;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tasks = getTasks();

    const cat = body.category || 'tony';
    const task = {
      id: generateId(),
      title: body.title,
      description: body.description || '',
      category: cat,
      assignee: cat, // backward compat for agents
      status: body.status || 'backlog',
      priority: body.priority || 'medium',
      source: body.source || 'manual',
      createdBy: body.createdBy || 'chris',
      assignedTo: body.assignedTo || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      notes: [],
      tags: body.tags || [],
      linkedCron: body.linkedCron || null,
      linkedSession: body.linkedSession || null,
    };

    tasks.push(task);
    saveTasks(tasks);
    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const tasks = getTasks();
    const index = tasks.findIndex(t => t.id === body.id);
    if (index === -1) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    // Merge updates
    const updated = { ...tasks[index], ...body, updatedAt: new Date().toISOString() };
    if (body.status === 'done' && !tasks[index].completedAt) {
      updated.completedAt = new Date().toISOString();
    }
    tasks[index] = updated;
    saveTasks(tasks);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
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
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
