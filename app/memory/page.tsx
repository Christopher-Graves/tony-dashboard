'use client';

import { useEffect, useState } from 'react';
import { Search, Brain, Calendar, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface MemoryFile {
  path: string;
  agent: string;
  filename: string;
  content: string;
  mtime: string;
  size: number;
}

export default function MemoryPage() {
  const [memories, setMemories] = useState<MemoryFile[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<MemoryFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedMemory, setSelectedMemory] = useState<MemoryFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMemories();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [memories, searchQuery, selectedAgent]);

  async function fetchMemories() {
    try {
      setLoading(true);
      const res = await fetch('/api/memory');
      if (!res.ok) throw new Error('Failed to fetch memories');
      const data = await res.json();
      setMemories(data);
      setFilteredMemories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let filtered = memories;

    // Agent filter
    if (selectedAgent !== 'all') {
      filtered = filtered.filter(m => m.agent === selectedAgent);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => {
        return (
          m.content.toLowerCase().includes(query) ||
          m.filename.toLowerCase().includes(query) ||
          m.agent.toLowerCase().includes(query)
        );
      });
    }

    setFilteredMemories(filtered);
  }

  const agents = ['all', ...Array.from(new Set(memories.map(m => m.agent)))];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Brain className="h-6 w-6 animate-pulse" />
          <span>Loading memories...</span>
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

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-card px-3 md:px-6 py-3 md:py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3">
            <Brain className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-bold">Agent Memories</h1>
          </div>
          <div className="text-xs md:text-sm text-muted-foreground">
            {filteredMemories.length} {filteredMemories.length === 1 ? 'file' : 'files'}
          </div>
        </div>

        {/* Filters */}
        <div className="mt-3 md:mt-4 flex flex-col sm:flex-row gap-2 md:gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Agent filter */}
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {agents.map(agent => (
              <option key={agent} value={agent}>
                {agent === 'all' ? 'All Agents' : agent}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Memory list */}
        <div className="w-full md:w-96 h-1/3 md:h-auto overflow-y-auto border-b md:border-b-0 md:border-r border-border bg-card">
          {filteredMemories.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
              <div>
                <FileText className="mx-auto h-12 w-12 opacity-50" />
                <p className="mt-2">No memories found</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredMemories.map((memory) => (
                <button
                  key={memory.path}
                  onClick={() => setSelectedMemory(memory)}
                  className={`w-full p-4 text-left transition-colors hover:bg-accent ${
                    selectedMemory?.path === memory.path ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{memory.filename}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {memory.agent}
                      </div>
                    </div>
                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {new Date(memory.mtime).toLocaleDateString()} • {(memory.size / 1024).toFixed(1)}KB
                  </div>
                  <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {memory.content.substring(0, 100)}...
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Memory content */}
        <div className="flex-1 overflow-y-auto bg-background p-6">
          {selectedMemory ? (
            <div className="mx-auto max-w-4xl">
              <div className="mb-6 border-b border-border pb-4">
                <h2 className="text-2xl font-bold">{selectedMemory.filename}</h2>
                <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Agent: {selectedMemory.agent}</span>
                  <span>•</span>
                  <span>{new Date(selectedMemory.mtime).toLocaleString()}</span>
                  <span>•</span>
                  <span>{(selectedMemory.size / 1024).toFixed(1)}KB</span>
                </div>
              </div>
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown>{selectedMemory.content}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Brain className="mx-auto h-16 w-16 opacity-50" />
                <p className="mt-4">Select a memory to view</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
