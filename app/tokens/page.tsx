'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SessionInfo {
  sessionId: string;
  key: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model?: string;
  lastActivity: string;
}

interface AgentUsage {
  agentId: string;
  agentName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  sessionCount: number;
  sessions: SessionInfo[];
}

export default function TokensPage() {
  const [usage, setUsage] = useState<AgentUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = async () => {
    try {
      const response = await fetch('/api/tokens');
      if (response.ok) {
        const data = await response.json();
        setUsage(Array.isArray(data) ? data : []);
        setError(null);
      } else {
        setError('Failed to fetch token data');
      }
    } catch (err) {
      setError('Error fetching token usage');
      console.error('Error fetching token usage:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
    const interval = setInterval(fetchTokens, 30000);
    return () => clearInterval(interval);
  }, []);

  const chartData = usage.map((u) => ({
    name: u.agentName,
    tokens: u.totalTokens,
  }));

  const totalTokens = usage.reduce((sum, u) => sum + (u.totalTokens || 0), 0);
  const totalInput = usage.reduce((sum, u) => sum + (u.inputTokens || 0), 0);
  const totalOutput = usage.reduce((sum, u) => sum + (u.outputTokens || 0), 0);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading token usage...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Token Usage</h1>
        <p className="text-muted-foreground">
          Total: {totalTokens.toLocaleString()} tokens
          ({totalInput.toLocaleString()} in / {totalOutput.toLocaleString()} out)
        </p>
      </div>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Token Usage by Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
                <YAxis stroke="hsl(var(--foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [value.toLocaleString(), 'Tokens']}
                />
                <Bar dataKey="tokens" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {usage.map((agent) => (
          <Card key={agent.agentId}>
            <CardHeader>
              <CardTitle className="text-lg">{agent.agentName}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-2xl font-bold">
                  {(agent.totalTokens || 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  {(agent.inputTokens || 0).toLocaleString()} in / {(agent.outputTokens || 0).toLocaleString()} out
                  &nbsp;·&nbsp;{agent.sessionCount || 0} session{(agent.sessionCount || 0) !== 1 ? 's' : ''}
                </div>
                {(agent.sessions || []).slice(0, 3).map((session) => (
                  <div key={session.key || session.sessionId} className="border-t border-border pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="truncate font-mono text-xs max-w-[200px]">
                        {(session.key || session.sessionId || '').split(':').slice(-1)[0].slice(0, 20)}
                      </span>
                      <span className="text-muted-foreground">
                        {(session.totalTokens || 0).toLocaleString()}
                      </span>
                    </div>
                    {session.model && (
                      <div className="text-xs text-muted-foreground">{session.model}</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
