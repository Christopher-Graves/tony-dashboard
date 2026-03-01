'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, ChevronDown, ChevronRight } from 'lucide-react';

interface DocketData {
  slug: string;
  meta: {
    status: string;
    ethanScore: number | null;
    notionUrl: string | null;
    createdAt: string;
    updatedAt: string;
    topic: string;
    angle: string;
  };
  researchDocket: string;
  chrisNotes: string;
  titles: string | null;
  thumbnailConcepts: string | null;
  scriptOutline: string | null;
  brollShotlist: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  'research-review': { label: 'Research Review', emoji: '🔍', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  'chris-notes': { label: 'Brain Dump', emoji: '✍️', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  'production': { label: 'Production', emoji: '🎬', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  'ready-to-shoot': { label: 'Ready to Shoot', emoji: '✅', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  'shot': { label: 'Shot', emoji: '🎥', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  'published': { label: 'Published', emoji: '📺', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
};

function simpleMarkdownToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let inList = false;
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let inNumberedList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Code blocks (```)
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        result.push(`<pre class="bg-muted p-3 rounded-md my-2 overflow-x-auto text-sm"><code>${codeContent.join('\n')}</code></pre>`);
        codeContent = [];
        inCodeBlock = false;
      } else {
        if (inList) { result.push('</ul>'); inList = false; }
        if (inNumberedList) { result.push('</ol>'); inNumberedList = false; }
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeContent.push(line.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      continue;
    }

    // Empty line
    if (!line.trim()) {
      if (inList) { result.push('</ul>'); inList = false; }
      if (inNumberedList) { result.push('</ol>'); inNumberedList = false; }
      continue;
    }

    // Inline formatting helper
    const fmt = (s: string) => {
      // Bold+italic
      s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
      // Bold
      s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      // Italic
      s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
      // Links
      s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener">$1</a>');
      // Raw URLs (not already in href)
      s = s.replace(/(?<!href="|">)(https?:\/\/[^\s<)]+)/g, '<a href="$1" class="text-primary hover:underline" target="_blank" rel="noopener">$1</a>');
      // Inline code
      s = s.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm">$1</code>');
      return s;
    };

    // Headers
    if (line.startsWith('### ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      if (inNumberedList) { result.push('</ol>'); inNumberedList = false; }
      result.push(`<h3 class="text-lg font-semibold mt-4 mb-2">${fmt(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      if (inNumberedList) { result.push('</ol>'); inNumberedList = false; }
      result.push(`<h2 class="text-xl font-semibold mt-6 mb-3">${fmt(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith('# ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      if (inNumberedList) { result.push('</ol>'); inNumberedList = false; }
      result.push(`<h1 class="text-2xl font-bold mt-8 mb-4">${fmt(line.slice(2))}</h1>`);
      continue;
    }

    // Divider
    if (line.trim() === '---') {
      if (inList) { result.push('</ul>'); inList = false; }
      if (inNumberedList) { result.push('</ol>'); inNumberedList = false; }
      result.push('<hr class="my-4 border-border" />');
      continue;
    }

    // Bullet list
    if (line.trim().startsWith('- ')) {
      if (inNumberedList) { result.push('</ol>'); inNumberedList = false; }
      if (!inList) { result.push('<ul class="list-disc space-y-1 my-2 ml-5">'); inList = true; }
      result.push(`<li>${fmt(line.trim().slice(2))}</li>`);
      continue;
    }

    // Numbered list
    const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      if (inList) { result.push('</ul>'); inList = false; }
      if (!inNumberedList) { result.push('<ol class="list-decimal space-y-1 my-2 ml-5">'); inNumberedList = true; }
      result.push(`<li>${fmt(numMatch[2])}</li>`);
      continue;
    }

    // Default: paragraph
    if (inList) { result.push('</ul>'); inList = false; }
    if (inNumberedList) { result.push('</ol>'); inNumberedList = false; }
    result.push(`<p class="mb-3">${fmt(line)}</p>`);
  }

  if (inList) result.push('</ul>');
  if (inNumberedList) result.push('</ol>');

  return result.join('\n');
}

function CollapsibleSection({ title, content }: { title: string; content: string | null }) {
  const [open, setOpen] = useState(false);
  
  if (!content) return null;
  
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <span className="font-medium text-sm">{title}</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="p-4 prose prose-sm prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(content) }} />
        </div>
      )}
    </div>
  );
}

export default function DocketDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const [slug, setSlug] = useState<string>('');
  const [docket, setDocket] = useState<DocketData | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    params.then(p => setSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    
    fetch(`/api/video-pipeline/${slug}`)
      .then(res => res.json())
      .then(data => {
        setDocket(data);
        setNotes(data.chrisNotes || '');
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load docket:', err);
        setLoading(false);
      });
  }, [slug]);

  const saveNotes = async () => {
    if (!slug) return;
    
    setSaving(true);
    try {
      await fetch(`/api/video-pipeline/${slug}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    
    // Auto-save after 30 seconds of no changes
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    autoSaveTimer.current = setTimeout(() => {
      saveNotes();
    }, 30000);
  };

  const triggerPhase2 = async () => {
    if (!slug) return;
    if (!confirm('Kick off Phase 2? This will trigger Derral to create titles, thumbnails, script outline, and B-roll doc.')) return;
    
    try {
      await fetch(`/api/video-pipeline/${slug}/phase2`, {
        method: 'POST',
      });
      // Refresh docket data
      const res = await fetch(`/api/video-pipeline/${slug}`);
      const data = await res.json();
      setDocket(data);
    } catch (err) {
      console.error('Failed to trigger Phase 2:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!docket) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Docket not found</p>
      </div>
    );
  }

  const statusInfo = STATUS_CONFIG[docket.meta.status] || { label: docket.meta.status, emoji: '📝', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
  const canTriggerPhase2 = docket.meta.status === 'chris-notes' && notes.trim().length > 0;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="border-b border-border bg-card px-3 md:px-6 py-3 md:py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
          <Button variant="ghost" size="sm" onClick={() => router.push('/video-pipeline')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{docket.meta.topic}</h1>
            <p className="text-xs text-muted-foreground">{docket.meta.angle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={statusInfo.color}>
            {statusInfo.emoji} {statusInfo.label}
          </Badge>
          {docket.meta.ethanScore !== null && (
            <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              ⭐ {docket.meta.ethanScore}
            </Badge>
          )}
          {docket.meta.notionUrl && (
            <a href={docket.meta.notionUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2">
                📓 View in Notion
              </Button>
            </a>
          )}
          <Button
            onClick={triggerPhase2}
            disabled={!canTriggerPhase2}
            className="gap-2"
          >
            🚀 Kick Off Phase 2
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Panel - Research Docket */}
        <div className="w-full md:w-[60%] border-b md:border-b-0 md:border-r border-border overflow-y-auto p-3 md:p-6">
          <Card>
            <CardHeader>
              <CardTitle>Research Docket</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(docket.researchDocket) }} />
              </div>
            </CardContent>
          </Card>

          {/* Phase 2 Outputs */}
          {(docket.titles || docket.thumbnailConcepts || docket.scriptOutline || docket.brollShotlist) && (
            <div className="mt-6 space-y-3">
              <h2 className="text-lg font-semibold">Phase 2 Outputs</h2>
              <CollapsibleSection title="📝 Title Options" content={docket.titles} />
              <CollapsibleSection title="🎨 Thumbnail Concepts" content={docket.thumbnailConcepts} />
              <CollapsibleSection title="📋 Script Outline" content={docket.scriptOutline} />
              <CollapsibleSection title="🎬 B-Roll Shotlist" content={docket.brollShotlist} />
            </div>
          )}
        </div>

        {/* Right Panel - Brain Dump */}
        <div className="w-full md:w-[40%] flex flex-col">
          <div className="border-b border-border px-3 md:px-4 py-2 md:py-3 flex items-center justify-between bg-muted/20">
            <div>
              <h2 className="font-semibold">Brain Dump</h2>
              {lastSaved && (
                <p className="text-xs text-muted-foreground">
                  Last saved {lastSaved.toLocaleTimeString()}
                </p>
              )}
            </div>
            <Button size="sm" onClick={saveNotes} disabled={saving}>
              <Save className="h-3 w-3 mr-1" /> {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
          <div className="flex-1 flex flex-col p-4">
            <textarea
              value={notes}
              onChange={e => handleNotesChange(e.target.value)}
              className="flex-1 w-full bg-background border border-border rounded-lg p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Start typing your thoughts, ideas, questions, concerns, angles, hooks..."
            />
            <div className="mt-2 text-xs text-muted-foreground text-right">
              {notes.length.toLocaleString()} characters
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
