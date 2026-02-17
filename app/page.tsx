'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface Agent {
  id: string;
  name: string;
  workspace: string;
  status: 'active' | 'idle' | 'error';
  lastActivity?: string;
  tokenCount?: number;
  sessionId?: string;
}

export default function HomePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      if (!response.ok) throw new Error('Failed to fetch agents');
      const data = await response.json();
      setAgents(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading agents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Agent Status</h1>
        <p className="text-muted-foreground">Monitor all AI agents in your OpenClaw system</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {agents.map((agent) => (
          <Card key={agent.id} className="transition-all hover:shadow-lg">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{agent.name}</CardTitle>
                <Badge variant={getStatusVariant(agent.status)}>
                  {agent.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">ID:</span>{' '}
                  <span className="font-mono">{agent.id}</span>
                </div>
                {agent.lastActivity && (
                  <div>
                    <span className="text-muted-foreground">Last active:</span>{' '}
                    {formatDistanceToNow(new Date(agent.lastActivity), { addSuffix: true })}
                  </div>
                )}
                {agent.tokenCount !== undefined && (
                  <div>
                    <span className="text-muted-foreground">Tokens:</span>{' '}
                    {agent.tokenCount.toLocaleString()}
                  </div>
                )}
                {agent.sessionId && (
                  <div className="truncate">
                    <span className="text-muted-foreground">Session:</span>{' '}
                    <span className="font-mono text-xs">{agent.sessionId}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
