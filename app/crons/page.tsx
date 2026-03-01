'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Terminal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  model?: string;
  lastRun?: string;
  nextRun?: string;
  status: string;
  lastError?: string;
  enabled: boolean;
}

export default function CronsPage() {
  const [crons, setCrons] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const refreshCache = async () => {
    setRefreshing(true);
    try {
      // Trigger a cache refresh by calling the refresh endpoint
      // The refresh endpoint accepts POSTed job data from Tony or scripts
      // For now, just re-fetch the existing cache
      await fetchCrons();
    } finally {
      setRefreshing(false);
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
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Cron Jobs</h1>
          <p className="text-sm md:text-base text-muted-foreground">Scheduled tasks and automations</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshCache}
          disabled={refreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          To manually trigger a cron job, use the OpenClaw CLI:{' '}
          <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-foreground">
            openclaw cron run &lt;id&gt;
          </code>
        </span>
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
                    {cron.status === 'error' && (
                      <Badge variant="destructive">Error</Badge>
                    )}
                    <Badge variant={cron.enabled ? 'success' : 'secondary'}>
                      {cron.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                  {cron.lastError && (
                    <div className="rounded bg-destructive/10 px-3 py-2 text-destructive">
                      ⚠️ {cron.lastError}
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
