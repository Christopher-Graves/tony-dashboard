'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TokenUsage {
  agentId: string;
  agentName: string;
  totalTokens: number;
  sessions: Array<{
    sessionId: string;
    tokens: number;
    lastActivity: string;
  }>;
}

export default function TokensPage() {
  const [usage, setUsage] = useState<TokenUsage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTokens = async () => {
    try {
      const response = await fetch('/api/tokens');
      if (response.ok) {
        const data = await response.json();
        setUsage(Array.isArray(data) ? data : []);
      }
    } catch (err) {
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

  const totalTokens = usage.reduce((sum, u) => sum + u.totalTokens, 0);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading token usage...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Token Usage</h1>
        <p className="text-muted-foreground">
          Total tokens used: {totalTokens.toLocaleString()}
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
                  {agent.totalTokens.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  {agent.sessions.length} session{agent.sessions.length !== 1 ? 's' : ''}
                </div>
                {agent.sessions.slice(0, 3).map((session) => (
                  <div key={session.sessionId} className="border-t border-border pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="truncate font-mono text-xs">
                        {session.sessionId.slice(0, 16)}...
                      </span>
                      <span className="text-muted-foreground">
                        {session.tokens.toLocaleString()}
                      </span>
                    </div>
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
