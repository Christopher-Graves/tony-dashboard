'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Reminder {
  id: string;
  name: string;
  schedule: string;
  nextRun?: string;
  enabled: boolean;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReminders = async () => {
    try {
      const response = await fetch('/api/crons');
      if (!response.ok) throw new Error('Failed to fetch reminders');
      const data = await response.json();
      
      // Filter for reminder-type cron jobs
      const reminderJobs = Array.isArray(data) 
        ? data.filter((job: any) => 
            job.name.toLowerCase().includes('reminder') || 
            job.name.toLowerCase().includes('remind')
          )
        : [];
      
      setReminders(reminderJobs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setReminders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
    const interval = setInterval(fetchReminders, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading reminders...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Reminders</h1>
        <p className="text-muted-foreground">Active scheduled reminders</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {reminders.length === 0 ? (
        <Card>
          <CardContent className="flex h-48 flex-col items-center justify-center gap-2">
            <Bell className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No active reminders</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reminders.map((reminder) => (
            <Card key={reminder.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{reminder.name}</CardTitle>
                  <Badge variant={reminder.enabled ? 'success' : 'secondary'}>
                    {reminder.enabled ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Schedule:</span>{' '}
                    <span className="font-mono">{reminder.schedule}</span>
                  </div>
                  {reminder.nextRun && (
                    <div>
                      <span className="text-muted-foreground">Next:</span>{' '}
                      {formatDistanceToNow(new Date(reminder.nextRun), { addSuffix: true })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
