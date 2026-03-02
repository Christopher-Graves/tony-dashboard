'use client';

import { useEffect, useState } from 'react';
import { Users, Activity, Clock, Zap } from 'lucide-react';
import { api } from '@/lib/api';

interface Agent {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'error';
  lastActivity?: string;
  tokenCount?: number;
  identity?: {
    emoji?: string;
    role?: string;
    description?: string;
  };
  currentTask?: {
    title: string;
    status: string;
  };
}

export default function TeamPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      
      // Fetch agents and identities
      const [agentsRes, tasksRes] = await Promise.all([
        api.get('/api/agents'),
        api.get('/api/tasks').catch(() => ({ ok: false, json: async () => [] })),
      ]);
      
      if (!agentsRes.ok) throw new Error('Failed to fetch agents');
      
      const agentsData = await agentsRes.json();
      const tasksData = tasksRes.ok ? await tasksRes.json() : [];
      
      // Fetch identities for each agent
      const agentsWithIdentity = await Promise.all(
        agentsData.map(async (agent: Agent) => {
          try {
            const identity = await api.get('/api/identity', { agent: agent.id });
            if (identity) {
              agent.identity = identity;
            }
          } catch {
            // Identity fetch failed, continue without it
          }
          
          // Find current task
          const currentTask = tasksData.find(
            (t: any) => t.agent === agent.id && t.status === 'in-progress'
          );
          if (currentTask) {
            agent.currentTask = {
              title: currentTask.title,
              status: currentTask.status,
            };
          }
          
          return agent;
        })
      );
      
      setAgents(agentsWithIdentity);
      setTasks(tasksData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }

  function formatLastActivity(lastActivity?: string) {
    if (!lastActivity) return 'Never';
    
    const date = new Date(lastActivity);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-6 w-6 animate-pulse" />
          <span>Loading team...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          Error: {error}
        </div>
      </div>
    );
  }

  const activeAgents = agents.filter(a => a.status === 'active');
  const idleAgents = agents.filter(a => a.status === 'idle');

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-card px-3 md:px-6 py-3 md:py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-3">
            <Users className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-bold">Team Overview</h1>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-muted-foreground">{activeAgents.length} Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
              <span className="text-muted-foreground">{idleAgents.length} Idle</span>
            </div>
          </div>
        </div>
      </div>

      {/* Team grid */}
      <div className="flex-1 overflow-auto p-3 md:p-6">
        <div className="grid grid-cols-1 gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="rounded-lg border border-border bg-card p-4 transition-all hover:border-primary hover:shadow-lg"
            >
              {/* Agent header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">
                    {agent.identity?.emoji || '🤖'}
                  </div>
                  <div>
                    <h3 className="font-bold">{agent.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {agent.identity?.role || agent.id}
                    </p>
                  </div>
                </div>
                <div className={`h-3 w-3 rounded-full ${getStatusColor(agent.status)}`}></div>
              </div>

              {/* Description */}
              {agent.identity?.description && (
                <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                  {agent.identity.description}
                </p>
              )}

              {/* Stats */}
              <div className="mt-4 space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Last activity</span>
                  </div>
                  <span className="font-medium">
                    {formatLastActivity(agent.lastActivity)}
                  </span>
                </div>
                
                {agent.tokenCount !== undefined && agent.tokenCount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Zap className="h-4 w-4" />
                      <span>Tokens</span>
                    </div>
                    <span className="font-medium">
                      {agent.tokenCount.toLocaleString()}
                    </span>
                  </div>
                )}

                {agent.currentTask && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Activity className="h-4 w-4" />
                      <span>Current task</span>
                    </div>
                    <span className="truncate max-w-[150px] font-medium" title={agent.currentTask.title}>
                      {agent.currentTask.title}
                    </span>
                  </div>
                )}
              </div>

              {/* Status badge */}
              <div className="mt-3">
                <div className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                  agent.status === 'active' 
                    ? 'bg-green-500/10 text-green-500'
                    : agent.status === 'error'
                    ? 'bg-red-500/10 text-red-500'
                    : 'bg-yellow-500/10 text-yellow-500'
                }`}>
                  {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
