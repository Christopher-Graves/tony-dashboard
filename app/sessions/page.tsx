'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Trash2, Archive, ChevronDown, ChevronUp, AlertTriangle, Search } from 'lucide-react';
import { api } from '@/lib/api';

interface SessionData {
  key: string;
  sessionId: string;
  agentId: string;
  agentName: string;
  kind: string;
  channel: string;
  displayName: string;
  model: string;
  totalTokens: number;
  contextTokens: number;
  usagePercent: number;
  compactionCount: number;
  updatedAt: number;
  lastActivity: string;
  chatType: string;
  transcriptPath: string;
}

interface Summary {
  total: number;
  byKind: Record<string, number>;
  byAgent: Record<string, number>;
  totalTokens: number;
  nearLimit: number;
  overHalf: number;
}

type SortField = 'updatedAt' | 'totalTokens' | 'usagePercent' | 'agentName';
type SortDir = 'asc' | 'desc';

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function timeAgo(iso: string): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function usageBadge(pct: number) {
  if (pct >= 90) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (pct >= 75) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  if (pct >= 50) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
}

function kindBadge(kind: string) {
  const colors: Record<string, string> = {
    channel: 'bg-blue-500/20 text-blue-400',
    thread: 'bg-purple-500/20 text-purple-400',
    main: 'bg-emerald-500/20 text-emerald-400',
    cron: 'bg-amber-500/20 text-amber-400',
    subagent: 'bg-cyan-500/20 text-cyan-400',
    dm: 'bg-pink-500/20 text-pink-400',
    other: 'bg-gray-500/20 text-gray-400',
  };
  return colors[kind] || colors.other;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterKind, setFilterKind] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      const data = await api.get('/api/sessions');
      setSessions(data.sessions || []);
      setSummary(data.summary || null);
      setError(null);
    } catch (err) {
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const agents = useMemo(() => {
    const set = new Set(sessions.map(s => s.agentId));
    return Array.from(set).sort();
  }, [sessions]);

  const kinds = useMemo(() => {
    const set = new Set(sessions.map(s => s.kind));
    return Array.from(set).sort();
  }, [sessions]);

  const filtered = useMemo(() => {
    let list = sessions;
    if (filterAgent !== 'all') list = list.filter(s => s.agentId === filterAgent);
    if (filterKind !== 'all') list = list.filter(s => s.kind === filterKind);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.key.toLowerCase().includes(q) ||
        s.displayName.toLowerCase().includes(q) ||
        s.agentName.toLowerCase().includes(q) ||
        s.model.toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      const av = a[sortField], bv = b[sortField];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'desc' ? bv - av : av - bv;
      }
      return sortDir === 'desc'
        ? String(bv).localeCompare(String(av))
        : String(av).localeCompare(String(bv));
    });
    return list;
  }, [sessions, filterAgent, filterKind, search, sortField, sortDir]);

  const handleAction = async (action: 'compact' | 'delete', session: SessionData) => {
    if (action === 'delete' && confirmDelete !== session.key) {
      setConfirmDelete(session.key);
      return;
    }
    setConfirmDelete(null);
    setActionLoading(session.key);
    try {
      const data = await api.post('/api/sessions', { action, sessionKey: session.key, agentId: session.agentId });
      if (data.success) {
        fetchSessions();
      } else {
        alert(`Action failed: ${data.error || 'Unknown error'}`);
      }
    } catch {
      alert('Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSessions.size === 0) return;
    if (!confirm(`Delete ${selectedSessions.size} sessions? This cannot be undone.`)) return;
    
    for (const key of selectedSessions) {
      const session = sessions.find(s => s.key === key);
      if (!session) continue;
      try {
        await api.post('/api/sessions', { action: 'delete', sessionKey: session.key, agentId: session.agentId });
      } catch {
        // continue
      }
    }
    setSelectedSessions(new Set());
    fetchSessions();
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'desc' ? <ChevronDown className="h-3 w-3 inline" /> : <ChevronUp className="h-3 w-3 inline" />;
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><p className="text-muted-foreground">Loading sessions...</p></div>;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Sessions</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {summary?.total || 0} sessions · {formatTokens(summary?.totalTokens || 0)} total tokens
            {(summary?.nearLimit || 0) > 0 && (
              <span className="ml-1 md:ml-2 text-orange-400">
                · <AlertTriangle className="h-3 w-3 inline" /> {summary?.nearLimit} near limit
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedSessions.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1 rounded-md bg-red-500/20 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/30 transition-colors"
            >
              <Trash2 className="h-4 w-4" /> Delete {selectedSessions.size}
            </button>
          )}
          <button
            onClick={() => { setLoading(true); fetchSessions(); }}
            className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-sm hover:bg-accent/80 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {Object.entries(summary.byKind).sort((a, b) => b[1] - a[1]).map(([kind, count]) => (
            <Card key={kind} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setFilterKind(filterKind === kind ? 'all' : kind)}>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground capitalize">{kind}</div>
                <div className="text-xl font-bold">{count}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-card pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={filterAgent}
          onChange={e => setFilterAgent(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="all">All Agents</option>
          {agents.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={filterKind}
          onChange={e => setFilterKind(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="all">All Types</option>
          {kinds.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <table className="w-full text-xs md:text-sm min-w-[800px]">
            <thead className="bg-card border-b border-border">
              <tr>
                <th className="p-3 text-left w-8">
                  <input
                    type="checkbox"
                    checked={selectedSessions.size === filtered.length && filtered.length > 0}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedSessions(new Set(filtered.map(s => s.key)));
                      } else {
                        setSelectedSessions(new Set());
                      }
                    }}
                    className="rounded"
                  />
                </th>
                <th className="p-3 text-left cursor-pointer hover:text-primary" onClick={() => toggleSort('agentName')}>
                  Agent <SortIcon field="agentName" />
                </th>
                <th className="p-3 text-left">Session</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Model</th>
                <th className="p-3 text-right cursor-pointer hover:text-primary" onClick={() => toggleSort('totalTokens')}>
                  Tokens <SortIcon field="totalTokens" />
                </th>
                <th className="p-3 text-right cursor-pointer hover:text-primary" onClick={() => toggleSort('usagePercent')}>
                  Context <SortIcon field="usagePercent" />
                </th>
                <th className="p-3 text-right">Compactions</th>
                <th className="p-3 text-right cursor-pointer hover:text-primary" onClick={() => toggleSort('updatedAt')}>
                  Last Active <SortIcon field="updatedAt" />
                </th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(session => (
                <tr
                  key={session.key}
                  className={`border-b border-border hover:bg-accent/30 transition-colors ${
                    session.usagePercent >= 90 ? 'bg-red-500/5' : session.usagePercent >= 75 ? 'bg-orange-500/5' : ''
                  }`}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedSessions.has(session.key)}
                      onChange={e => {
                        const next = new Set(selectedSessions);
                        e.target.checked ? next.add(session.key) : next.delete(session.key);
                        setSelectedSessions(next);
                      }}
                      className="rounded"
                    />
                  </td>
                  <td className="p-3 font-medium">{session.agentName}</td>
                  <td className="p-3">
                    <div className="font-mono text-xs truncate max-w-[250px]" title={session.key}>
                      {session.displayName}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground truncate max-w-[250px]" title={session.key}>
                      {session.key}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${kindBadge(session.kind)}`}>
                      {session.kind}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{session.model}</td>
                  <td className="p-3 text-right font-mono">
                    {formatTokens(session.totalTokens)}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            session.usagePercent >= 90 ? 'bg-red-500' :
                            session.usagePercent >= 75 ? 'bg-orange-500' :
                            session.usagePercent >= 50 ? 'bg-yellow-500' :
                            'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(session.usagePercent, 100)}%` }}
                        />
                      </div>
                      <span className={`inline-block rounded border px-1.5 py-0.5 text-xs font-mono ${usageBadge(session.usagePercent)}`}>
                        {session.usagePercent}%
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-right font-mono text-muted-foreground">
                    {session.compactionCount}
                  </td>
                  <td className="p-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                    {timeAgo(session.lastActivity)}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleAction('compact', session)}
                        disabled={actionLoading === session.key}
                        className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        title="Compact session"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleAction('delete', session)}
                        disabled={actionLoading === session.key}
                        className={`rounded p-1.5 transition-colors ${
                          confirmDelete === session.key
                            ? 'bg-red-500/20 text-red-400'
                            : 'text-muted-foreground hover:bg-red-500/10 hover:text-red-400'
                        }`}
                        title={confirmDelete === session.key ? 'Click again to confirm' : 'Delete session'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No sessions match your filters.
          </div>
        )}
      </div>
    </div>
  );
}
