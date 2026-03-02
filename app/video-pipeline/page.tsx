'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

interface Docket {
  slug: string;
  topic: string;
  status: string;
  ethanScore: number | null;
  createdAt: string;
  hasNotes: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  'research-review': { label: 'Research Review', emoji: '🔍', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  'chris-notes': { label: 'Brain Dump', emoji: '✍️', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  'production': { label: 'Production', emoji: '🎬', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  'ready-to-shoot': { label: 'Ready to Shoot', emoji: '✅', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  'shot': { label: 'Shot', emoji: '🎥', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  'published': { label: 'Published', emoji: '📺', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
};

export default function VideoPipelinePage() {
  const [dockets, setDockets] = useState<Docket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/video-pipeline')
      .then(res => res.json())
      .then(data => {
        setDockets(data.dockets || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load dockets:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Video Pipeline</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Research dockets → brain dump → production
          </p>
        </div>
        <Link 
          href="/content-calendar"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          View Content Calendar →
        </Link>
      </div>

      {dockets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No dockets yet. Ethan will create them as research comes in.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {dockets.map(docket => {
            const statusInfo = STATUS_CONFIG[docket.status] || { label: docket.status, emoji: '📝', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
            const date = new Date(docket.createdAt);
            
            return (
              <Link key={docket.slug} href={`/video-pipeline/${docket.slug}`}>
                <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge variant="outline" className={statusInfo.color}>
                        {statusInfo.emoji} {statusInfo.label}
                      </Badge>
                      {docket.ethanScore !== null && (
                        <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                          ⭐ {docket.ethanScore}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{docket.topic}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      {docket.hasNotes && (
                        <span className="text-blue-400">✍️ Has notes</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
