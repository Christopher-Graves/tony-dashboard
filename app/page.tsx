'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';

interface GatewayStatus {
  status: 'running' | 'stopped' | 'unreachable';
  agentCount?: number | null;
  sessionCount?: number | null;
  latency?: string | null;
  version?: string | null;
  memoryStatus?: string | null;
  security?: string | null;
  error?: string;
  checkedAt: string;
}

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
  const [gateway, setGateway] = useState<GatewayStatus | null>(null);
  const [gwLoading, setGwLoading] = useState(true);
  const [restarting, setRestarting] = useState(false);

  const fetchGateway = useCallback(async () => {
    try {
      const data = await api.get('/api/gateway');
      setGateway(data);
    } catch {
      setGateway({ status: 'unreachable', checkedAt: new Date().toISOString(), error: 'Dashboard API unreachable' });
    } finally {
      setGwLoading(false);
    }
  }, []);

  const restartGateway = async () => {
    if (!confirm('Restart the OpenClaw gateway? Active sessions will briefly disconnect.')) return;
    setRestarting(true);
    try {
      const data = await api.post('/api/gateway', { action: 'restart' });
      if (data.success) {
        // Wait a few seconds for restart then refresh
        setTimeout(() => { fetchGateway(); setRestarting(false); }, 5000);
      } else {
        alert('Restart failed: ' + (data.error || 'Unknown error'));
        setRestarting(false);
      }
    } catch {
      alert('Restart request failed');
      setRestarting(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const data = await api.get('/api/agents');
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
    fetchGateway();
    const interval = setInterval(fetchAgents, 30000);
    const gwInterval = setInterval(fetchGateway, 30000);
    return () => { clearInterval(interval); clearInterval(gwInterval); };
  }, [fetchGateway]);

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
    <div className="p-4 md:p-6 lg:p-8">
      {/* Gateway Status */}
      <div className="mb-6 md:mb-8">
        <Card className={order-2 ${
          gateway?.status === 'running' ? 'border-emerald-500/30' :
          gateway?.status === 'stopped' ? 'border-red-500/30' :
          'border-yellow-500/30'
        }}>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={h-3 w-3 rounded-full ${
                  gateway?.status === 'running' ? 'bg-emerald-500 animate-pulse' :
                  gateway?.status === 'stopped' ? 'bg-red-500' :
                  'bg-yellow-500'
                }} />
                <CardTitle className="text-lg sm:text-xl">Gateway Status</CardTitle>
                {!gwLoading && gateway && (
                  <Badge variant={gateway.status === 'running' ? 'default' : 'destructive'}
                    className={gateway.status === 'running' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
                    {gateway.status.toUpperCase()}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={fetchGateway}
                  className="rounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-border hover:bg-accent transition-colors"
                  title=\"Refresh status\"
                >
                  ↻ <span className="hidden sm:inline">Refresh</span>
                </button>
                <button
                  onClick={restartGateway}
                  disabled={restarting}
                  className={ounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                    restarting
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                  }}
                >
                  {restarting ? '⏳ <span className="hidden sm:inline">Restarting...</span>' : '⟳ <span className="hidden sm:inline">Restart Gateway</span>'}
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {gwLoading ? (
              <p className="text-sm text-muted-foreground">Checking gateway...</p>
            ) : gateway ? (
              <div className="flex flex-wrap gap-6 text-sm">
                {gateway.agentCount != null && (
                  <div>
                    <span className="text-muted-foreground">Agents:</span>{' '}
                    <span className="font-semibold">{gateway.agentCount}</span>
                  </div>
                )}
                {gateway.sessionCount != null && (
                  <div>
                    <span className="text-muted-foreground">Sessions:</span>{' '}
                    <span className="font-semibold">{gateway.sessionCount.toLocaleString()}</span>
                  </div>
                )}
                {gateway.latency && (
                  <div>
                    <span className="text-muted-foreground">Latency:</span>{' '}
                    <span className="font-mono">{gateway.latency}</span>
                  </div>
                )}
                {gateway.version && (
                  <div>
                    <span className="text-muted-foreground">Update:</span>{' '}
                    <span className="font-mono text-orange-400">{gateway.version}</span>
                  </div>
                )}
                {gateway.security && (
                  <div>
                    <span className="text-muted-foreground">Security:</span>{' '}
                    <span>{gateway.security}</span>
                  </div>
                )}
                {gateway.error && (
                  <div className="text-red-500">
                    <span className="text-muted-foreground">Error:</span> {gateway.error}
                  </div>
                )}
                <div className="ml-auto text-muted-foreground text-xs">
                  Last checked: {new Date(gateway.checkedAt).toLocaleTimeString()}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Agent Status</h1>
        <p className="text-sm md:text-base text-muted-foreground">Monitor all AI agents in your OpenClaw system</p>
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
