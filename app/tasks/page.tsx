'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ChevronRight, Filter, Bot } from 'lucide-react';

interface TaskNote {
  timestamp: string;
  author: string;
  text: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  category: string;
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
  blocked?: boolean;
  plan?: string[];
  findings?: string;
  actions_taken?: string;
  blockers?: string;
}

type Status = 'backlog' | 'in-progress' | 'done' | 'cancelled';
type Priority = Task['priority'];

const AGENTS = [
  'tony', 'engineering', 'youtube', 'xagent', 'cozmos',
  'lifecoach', 'wellness', 'financial', 'thelab', 'ideas', 'momsbiz', 'family',
];

const AGENT_LABELS: Record<string, string> = {
  tony: 'Tony', engineering: 'Engineering', youtube: 'YouTube',
  xagent: 'X Agent', cozmos: 'Cozmos', lifecoach: 'Life Coach',
  wellness: 'Wellness', financial: 'Financial', thelab: 'The Lab',
  ideas: 'Idea Museum', momsbiz: "Mom's Biz", family: 'Family',
};

const AGENT_COLORS: Record<string, string> = {
  tony: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  engineering: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  youtube: 'bg-red-500/20 text-red-400 border-red-500/30',
  xagent: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  cozmos: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  lifecoach: 'bg-green-500/20 text-green-400 border-green-500/30',
  wellness: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  financial: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  thelab: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  ideas: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  momsbiz: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  family: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
};

const statusColumns: { id: Status; title: string; color: string; next: Status | null }[] = [
  { id: 'backlog', title: 'Backlog', color: 'bg-secondary', next: 'in-progress' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-primary', next: 'done' },
  { id: 'done', title: 'Done', color: 'bg-green-600', next: null },
];

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical'];
const STATUSES: Status[] = ['backlog', 'in-progress', 'done'];

interface NewTaskForm {
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: Status;
  tags: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [form, setForm] = useState<NewTaskForm>({
    title: '',
    description: '',
    category: 'tony',
    priority: 'medium',
    status: 'backlog',
    tags: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      const url = filterAgent === 'all' ? '/api/tasks' : `/api/tasks?category=${filterAgent}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTasks(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [filterAgent]);

  const createTask = async () => {
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category,
          priority: form.priority,
          status: form.status,
          source: 'manual',
          createdBy: 'chris',
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      if (response.ok) {
        await fetchTasks();
        setShowModal(false);
        setForm({ title: '', description: '', category: 'tony', priority: 'medium', status: 'backlog', tags: '' });
      }
    } catch (err) {
      console.error('Error creating task:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const moveTask = async (task: Task, nextStatus: Status) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, status: nextStatus }),
      });
      if (response.ok) {
        const saved = await response.json();
        setTasks(prev => prev.map(t => t.id === saved.id ? saved : t));
      }
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const deleteTask = async (id: string) => {
    setDeleting(id);
    try {
      const response = await fetch('/api/tasks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (response.ok) setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error deleting task:', err);
    } finally {
      setDeleting(null);
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      default: return 'secondary';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'agent': return '🤖';
      case 'cron': return '⏰';
      case 'monitor': return '🔍';
      default: return '👤';
    }
  };

  const tasksByStatus = (status: string) => tasks.filter(task => task.status === status);

  // Count tasks per agent for the filter bar
  const agentCounts = tasks.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Task Board</h1>
          <p className="text-sm md:text-base text-muted-foreground">Shared work queue across all agents</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Agent filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <button
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            filterAgent === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setFilterAgent('all')}
        >
          All ({tasks.length})
        </button>
        {AGENTS.filter(a => agentCounts[a]).map(agent => (
          <button
            key={agent}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filterAgent === agent
                ? AGENT_COLORS[agent] || 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground border-transparent'
            }`}
            onClick={() => setFilterAgent(filterAgent === agent ? 'all' : agent)}
          >
            {AGENT_LABELS[agent] || agent} ({agentCounts[agent]})
          </button>
        ))}
      </div>

      {/* New Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-semibold">New Task</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Title *</label>
                <input
                  className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary"
                  placeholder="What needs to be done..."
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && createTask()}
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Description</label>
                <textarea
                  className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary"
                  placeholder="Details, context, links..."
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Agent</label>
                  <select
                    className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  >
                    {AGENTS.map(a => (
                      <option key={a} value={a} className="bg-card">{AGENT_LABELS[a] || a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Priority</label>
                  <select
                    className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
                  >
                    {PRIORITIES.map(p => (
                      <option key={p} value={p} className="bg-card">{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Tags (comma-separated)</label>
                <input
                  className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary"
                  placeholder="dashboard, infrastructure, bug..."
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={createTask} disabled={submitting || !form.title.trim()}>
                {submitting ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban board */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-3 overflow-x-auto">
        {statusColumns.map(column => (
          <div key={column.id}>
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{column.title}</h2>
                <span className="text-sm text-muted-foreground">{tasksByStatus(column.id).length}</span>
              </div>
              <div className={`mt-1 h-1 rounded ${column.color}`} />
            </div>
            <div className="space-y-3">
              {tasksByStatus(column.id).length === 0 ? (
                <Card>
                  <CardContent className="flex h-24 items-center justify-center">
                    <p className="text-sm text-muted-foreground">No tasks</p>
                  </CardContent>
                </Card>
              ) : (
                tasksByStatus(column.id).map(task => (
                  <Card
                    key={task.id}
                    className="transition-all hover:shadow-lg cursor-pointer"
                    onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-tight">{task.title}</CardTitle>
                        <Badge variant={getPriorityVariant(task.priority)} className="shrink-0">
                          {task.priority}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* Agent badge */}
                      <div className="mb-2 flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${AGENT_COLORS[task.category] || 'bg-secondary text-muted-foreground'}`}>
                          <Bot className="h-3 w-3" />
                          {AGENT_LABELS[task.category] || task.category}
                        </span>
                        {task.blocked && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                            🚫 Blocked
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground" title={`Source: ${task.source}`}>
                          {getSourceIcon(task.source)}
                        </span>
                        {task.tags?.map(tag => (
                          <span key={tag} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Expanded details */}
                      {expandedTask === task.id && (
                        <div className="mb-2 space-y-2 border-t border-border pt-2">
                          {task.description && (
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                          )}
                          {task.blockers && (
                            <div className="rounded-md border border-red-500/20 bg-red-500/10 p-2">
                              <p className="text-xs font-medium text-red-400 mb-1">⚠️ Blockers</p>
                              <p className="text-xs text-red-300">{task.blockers}</p>
                            </div>
                          )}
                          {task.plan && task.plan.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">📋 Plan</p>
                              <ol className="list-decimal list-inside space-y-0.5">
                                {task.plan.map((step, i) => (
                                  <li key={i} className="text-xs text-muted-foreground">{step.replace(/^\d+\.\s*/, '')}</li>
                                ))}
                              </ol>
                            </div>
                          )}
                          {task.findings && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">🔍 Findings</p>
                              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{task.findings}</p>
                            </div>
                          )}
                          {task.actions_taken && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">✅ Actions Taken</p>
                              <p className="text-xs text-muted-foreground">{task.actions_taken}</p>
                            </div>
                          )}
                          {task.notes && task.notes.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">📝 Notes</p>
                              {task.notes.map((note, i) => (
                                <p key={i} className="text-xs text-muted-foreground">{note.text}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <button
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                          onClick={e => { e.stopPropagation(); deleteTask(task.id); }}
                          disabled={deleting === task.id}
                        >
                          <Trash2 className="h-3 w-3" />
                          {deleting === task.id ? '...' : 'Delete'}
                        </button>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(task.createdAt).toLocaleDateString()}
                        </span>
                        {column.next && (
                          <button
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                            onClick={e => { e.stopPropagation(); moveTask(task, column.next!); }}
                          >
                            Move <ChevronRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
