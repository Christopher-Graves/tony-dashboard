'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import {
  FolderOpen, File, ChevronRight, ChevronDown, Save, X, RefreshCw,
  FileText, Code, Settings, Database, ArrowLeft, Edit3, Eye, Search
} from 'lucide-react';

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  ext?: string;
  editable?: boolean;
  modifiedAt?: string;
  children?: FileEntry[];
}

interface Workspace {
  id: string;
  path: string;
  fileCount: number;
  source?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function timeAgo(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getFileIcon(entry: FileEntry) {
  if (entry.type === 'dir') return <FolderOpen className="h-4 w-4 text-yellow-500" />;
  const ext = entry.ext || '';
  if (['.md', '.mdx', '.txt'].includes(ext)) return <FileText className="h-4 w-4 text-blue-400" />;
  if (['.py', '.js', '.ts', '.tsx', '.jsx', '.sh', '.ps1'].includes(ext)) return <Code className="h-4 w-4 text-green-400" />;
  if (['.json', '.yaml', '.yml', '.toml', '.ini', '.cfg'].includes(ext)) return <Settings className="h-4 w-4 text-orange-400" />;
  if (['.sql', '.csv'].includes(ext)) return <Database className="h-4 w-4 text-purple-400" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

function TreeNode({
  entry, depth, onSelect, selectedPath, searchQuery
}: {
  entry: FileEntry; depth: number; onSelect: (entry: FileEntry) => void;
  selectedPath: string | null; searchQuery: string;
}) {
  const [expanded, setExpanded] = useState(depth < 1);

  // Auto-expand if search matches something inside
  const matchesSearch = searchQuery && entry.name.toLowerCase().includes(searchQuery.toLowerCase());
  const hasMatchingChild = searchQuery && entry.type === 'dir' && entry.children?.some(
    function check(c: FileEntry): boolean {
      if (c.name.toLowerCase().includes(searchQuery.toLowerCase())) return true;
      return c.children?.some(check) || false;
    }
  );

  useEffect(() => {
    if (hasMatchingChild && !expanded) setExpanded(true);
  }, [hasMatchingChild, searchQuery]);

  if (searchQuery && !matchesSearch && !hasMatchingChild && entry.type === 'file') return null;

  const isSelected = selectedPath === entry.path;

  if (entry.type === 'dir') {
    const visibleChildren = entry.children?.filter(c => {
      if (!searchQuery) return true;
      if (c.name.toLowerCase().includes(searchQuery.toLowerCase())) return true;
      if (c.type === 'dir') {
        return c.children?.some(function check(cc: FileEntry): boolean {
          if (cc.name.toLowerCase().includes(searchQuery.toLowerCase())) return true;
          return cc.children?.some(check) || false;
        });
      }
      return false;
    });

    return (
      <div>
        <div
          className="flex items-center gap-1 py-1 px-2 rounded cursor-pointer hover:bg-accent/50 transition-colors"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
          {getFileIcon(entry)}
          <span className={`text-sm truncate ${matchesSearch ? 'text-yellow-400 font-medium' : ''}`}>{entry.name}</span>
          {entry.children && <span className="text-xs text-muted-foreground ml-auto">{entry.children.length}</span>}
        </div>
        {expanded && visibleChildren?.map(child => (
          <TreeNode key={child.path} entry={child} depth={depth + 1} onSelect={onSelect} selectedPath={selectedPath} searchQuery={searchQuery} />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1.5 py-1 px-2 rounded cursor-pointer transition-colors ${
        isSelected ? 'bg-primary/20 text-primary' : 'hover:bg-accent/50'
      } ${matchesSearch ? 'ring-1 ring-yellow-500/30' : ''}`}
      style={{ paddingLeft: `${depth * 16 + 20}px` }}
      onClick={() => onSelect(entry)}
    >
      {getFileIcon(entry)}
      <span className={`text-sm truncate ${matchesSearch ? 'text-yellow-400 font-medium' : ''}`}>{entry.name}</span>
      <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
        {entry.size ? formatSize(entry.size) : ''}
      </span>
    </div>
  );
}

export default function FilesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [tree, setTree] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [editedContent, setEditedContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load workspaces
  useEffect(() => {
    api.get('/api/files')
      .then(r => r.json())
      .then(d => setWorkspaces(d.workspaces || []))
      .catch(() => setError('Failed to load workspaces'))
      .finally(() => setLoading(false));
  }, []);

  // Load file tree for selected agent
  const loadTree = useCallback(async (agent: string) => {
    setTreeLoading(true);
    setSelectedFile(null);
    setFileContent('');
    setIsEditing(false);
    setSearchQuery('');
    try {
      const data = await api.get('/api/files', { agent });
      setTree(data.tree || []);
      setError(null);
    } catch {
      setError('Failed to load file tree');
    }
    setTreeLoading(false);
  }, []);

  const selectAgent = (id: string) => {
    setSelectedAgent(id);
    loadTree(id);
  };

  // Load file content
  const selectFile = async (entry: FileEntry) => {
    if (entry.type === 'dir') return;
    setSelectedFile(entry);
    setIsEditing(false);
    setFileLoading(true);
    setSaveStatus(null);
    try {
      const data = await api.get(`/api/files`, { agent: selectedAgent || '', path: entry.path });
      if (data.error) {
        setFileContent(`Error: ${data.error}`);
      } else {
        setFileContent(data.content);
        setEditedContent(data.content);
      }
    } catch {
      setFileContent('Failed to load file');
    }
    setFileLoading(false);
  };

  // Save file
  const saveFile = async () => {
    if (!selectedAgent || !selectedFile) return;
    setSaving(true);
    setSaveStatus(null);
    try {
      const data = await api.post('/api/files', { agent: selectedAgent, path: selectedFile.path, content: editedContent });
      if (data.success) {
        setFileContent(editedContent);
        setSaveStatus('Saved!');
        setIsEditing(false);
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus(`Error: ${data.error}`);
      }
    } catch {
      setSaveStatus('Failed to save');
    }
    setSaving(false);
  };

  const hasChanges = isEditing && editedContent !== fileContent;

  if (loading) {
    return <div className="flex h-full items-center justify-center"><p className="text-muted-foreground">Loading workspaces...</p></div>;
  }

  // Workspace picker
  if (!selectedAgent) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">Agent Files</h1>
        <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">Browse and edit agent workspace files</p>
        <div className="grid grid-cols-1 gap-2 md:gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {workspaces.sort((a, b) => a.id.localeCompare(b.id)).map(ws => (
            <Card
              key={ws.id}
              className="cursor-pointer hover:bg-accent/50 hover:border-primary/30 transition-all"
              onClick={() => selectAgent(ws.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-8 w-8 text-yellow-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-lg capitalize truncate">{ws.id}</div>
                    <div className="text-xs text-muted-foreground">
                      {ws.fileCount} items
                      {ws.source && ws.source !== 'local' && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20">
                          📡 {ws.source}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Sidebar — File Tree */}
      <div className="w-full md:w-80 border-r border-border flex flex-col bg-card shrink-0 md:max-w-xs">
        {/* Header */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => { setSelectedAgent(null); setTree([]); setSelectedFile(null); }} className="p-1 rounded hover:bg-accent transition-colors" title="Back to workspaces">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="font-bold capitalize text-lg">{selectedAgent}</h2>
            <button onClick={() => loadTree(selectedAgent)} className="p-1 rounded hover:bg-accent transition-colors ml-auto" title="Refresh">
              <RefreshCw className={`h-4 w-4 ${treeLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter files..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded border border-border bg-background pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto py-1">
          {treeLoading ? (
            <p className="text-sm text-muted-foreground p-4">Loading...</p>
          ) : tree.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">Empty workspace</p>
          ) : (
            tree.map(entry => (
              <TreeNode key={entry.path} entry={entry} depth={0} onSelect={selectFile} selectedPath={selectedFile?.path || null} searchQuery={searchQuery} />
            ))
          )}
        </div>
      </div>

      {/* Main — File Viewer/Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedFile ? (
          <>
            {/* File header */}
            <div className="p-3 border-b border-border flex items-center gap-3 bg-card">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {getFileIcon(selectedFile)}
                <span className="font-mono text-sm truncate">{selectedFile.path}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {selectedFile.size ? formatSize(selectedFile.size) : ''}
                  {selectedFile.modifiedAt ? ` · ${timeAgo(selectedFile.modifiedAt)}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {saveStatus && (
                  <span className={`text-xs ${saveStatus.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                    {saveStatus}
                  </span>
                )}
                {isEditing ? (
                  <>
                    <button
                      onClick={saveFile}
                      disabled={saving || !hasChanges}
                      className="flex items-center gap-1 rounded bg-primary/20 px-3 py-1.5 text-xs text-primary hover:bg-primary/30 transition-colors disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => { setIsEditing(false); setEditedContent(fileContent); }}
                      className="flex items-center gap-1 rounded bg-accent px-3 py-1.5 text-xs hover:bg-accent/80 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                  </>
                ) : (
                  selectedFile.editable && (
                    <button
                      onClick={() => { setIsEditing(true); setEditedContent(fileContent); }}
                      className="flex items-center gap-1 rounded bg-accent px-3 py-1.5 text-xs hover:bg-accent/80 transition-colors"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Edit
                    </button>
                  )
                )}
              </div>
            </div>

            {/* File content */}
            <div className="flex-1 overflow-auto p-0">
              {fileLoading ? (
                <p className="text-sm text-muted-foreground p-4">Loading file...</p>
              ) : isEditing ? (
                <textarea
                  value={editedContent}
                  onChange={e => setEditedContent(e.target.value)}
                  className="w-full h-full resize-none bg-background p-4 font-mono text-sm focus:outline-none"
                  spellCheck={false}
                />
              ) : (
                <pre className="p-4 font-mono text-sm whitespace-pre-wrap break-words text-foreground/90">
                  {fileContent}
                </pre>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Eye className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg">Select a file to view</p>
              <p className="text-sm mt-1">Click any file in the tree to preview or edit it</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

