'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: 'backlog' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

const statusColumns = [
  { id: 'backlog', title: 'Backlog', color: 'bg-secondary' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-primary' },
  { id: 'done', title: 'Done', color: 'bg-green-600' },
] as const;

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
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

  useEffect(() => {
    fetchTasks();
  }, []);

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const tasksByStatus = (status: string) =>
    tasks.filter((task) => task.status === status);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Kanban board for task management</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {statusColumns.map((column) => (
          <div key={column.id}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">{column.title}</h2>
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
                tasksByStatus(column.id).map((task) => (
                  <Card key={task.id} className="transition-all hover:shadow-lg">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{task.title}</CardTitle>
                        <Badge variant={getPriorityVariant(task.priority)} className="ml-2">
                          {task.priority}
                        </Badge>
                      </div>
                    </CardHeader>
                    {task.assignedTo && (
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground">
                          Assigned to: {task.assignedTo}
                        </p>
                      </CardContent>
                    )}
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
