'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  model?: string;
  lastRun?: string;
  nextRun?: string;
  status: string;
  enabled: boolean;
}

export default function CronsPage() {
  const [crons, setCrons] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState<string | null>(null);

  const fetchCrons = async () => {
    try {
      const response = await fetch('/api/crons');
      if (!response.ok) throw new Error('Failed to fetch cron jobs');
      const data = await response.json();
      setCrons(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setCrons([]);
    } finally {
      setLoading(false);
    }
  };

  const triggerCron = async (id: string) => {
    setTriggering(id);
    try {
      const response = await fetch(`/api/crons/${id}/run`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to trigger cron');
      await fetchCrons();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to trigger cron');
    } finally {
      setTriggering(null);
    }
  };

  useEffect(() => {
    fetchCrons();
    const interval = setInterval(fetchCrons, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading cron jobs...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Cron Jobs</h1>
        <p className="text-muted-foreground">Scheduled tasks and automations</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {crons.length === 0 ? (
        <Card>
          <CardContent className="flex h-48 items-center justify-center">
            <p className="text-muted-foreground">No cron jobs found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {crons.map((cron) => (
            <Card key={cron.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{cron.name}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {cron.schedule}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={cron.enabled ? 'success' : 'secondary'}>
                      {cron.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => triggerCron(cron.id)}
                      disabled={triggering === cron.id || !cron.enabled}
                    >
                      <Play className="mr-1 h-3 w-3" />
                      {triggering === cron.id ? 'Running...' : 'Run'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                  {cron.model && (
                    <div>
                      <span className="text-muted-foreground">Model:</span>{' '}
                      <span className="font-mono">{cron.model}</span>
                    </div>
                  )}
                  {cron.lastRun && (
                    <div>
                      <span className="text-muted-foreground">Last run:</span>{' '}
                      {formatDistanceToNow(new Date(cron.lastRun), { addSuffix: true })}
                    </div>
                  )}
                  {cron.nextRun && (
                    <div>
                      <span className="text-muted-foreground">Next run:</span>{' '}
                      {formatDistanceToNow(new Date(cron.nextRun), { addSuffix: true })}
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
