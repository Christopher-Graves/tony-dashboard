'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Circle } from 'lucide-react';
import { api } from '@/lib/api';

interface VideoStages {
  docket: boolean;
  takes: boolean;
  script: boolean;
  title_thumbnail_lock: boolean;
  filmed: boolean;
  edited: boolean;
  scheduled: boolean;
}

interface VideoItem {
  id: string;
  pillar: string;
  title: string;
  stages: VideoStages;
  publishDate: string | null;
  blocking: string;
  updatedAt: string;
}

interface ContentCalendarData {
  videos: VideoItem[];
}

const PILLAR_COLORS: Record<string, string> = {
  'AI & Tech': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Health & Performance': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Style & Presentation': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Career & Money': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Culture & Ideas': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Lifestyle & Experiences': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
};

function StageIcon({ completed }: { completed: boolean }) {
  return completed ? (
    <CheckCircle2 className="h-5 w-5 text-green-400" />
  ) : (
    <Circle className="h-5 w-5 text-muted-foreground/40" />
  );
}

export default function ContentCalendarPage() {
  const [data, setData] = useState<ContentCalendarData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const json = await api.get('/api/content-calendar');
        setData(json);
      } catch (e) {
        console.error('Failed to fetch content calendar:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Failed to load content calendar.</p>
      </div>
    );
  }

  const totalVideos = data.videos.length;
  const inProgress = data.videos.filter(
    v => v.stages.docket && !v.stages.scheduled
  ).length;
  const completed = data.videos.filter(v => v.stages.scheduled).length;

  return (
    <div className="p-3 md:p-4 lg:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Content Calendar</h1>
        <p className="text-xs md:text-sm text-muted-foreground">
          YouTube video pipeline tracker
        </p>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Videos</span>
            <span className="text-2xl font-bold text-primary">{totalVideos}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">In Progress</span>
            <span className="text-2xl font-bold text-blue-400">{inProgress}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Completed</span>
            <span className="text-2xl font-bold text-green-400">{completed}</span>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                Video
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                Pillar
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                Title
              </th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-muted-foreground">
                Docket
              </th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-muted-foreground">
                Takes
              </th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-muted-foreground">
                Script
              </th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-muted-foreground">
                T/T Lock
              </th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-muted-foreground">
                Filmed
              </th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-muted-foreground">
                Edited
              </th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-muted-foreground">
                Scheduled
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                Publish Date
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                Blocking
              </th>
            </tr>
          </thead>
          <tbody>
            {data.videos.map(video => (
              <tr key={video.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4">
                  <span className="font-mono text-sm font-semibold">{video.id}</span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border ${
                      PILLAR_COLORS[video.pillar] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                    }`}
                  >
                    {video.pillar}
                  </span>
                </td>
                <td className="py-3 px-4 max-w-md">
                  <span className="text-sm">{video.title}</span>
                </td>
                <td className="py-3 px-2 text-center">
                  <div className="flex justify-center">
                    <StageIcon completed={video.stages.docket} />
                  </div>
                </td>
                <td className="py-3 px-2 text-center">
                  <div className="flex justify-center">
                    <StageIcon completed={video.stages.takes} />
                  </div>
                </td>
                <td className="py-3 px-2 text-center">
                  <div className="flex justify-center">
                    <StageIcon completed={video.stages.script} />
                  </div>
                </td>
                <td className="py-3 px-2 text-center">
                  <div className="flex justify-center">
                    <StageIcon completed={video.stages.title_thumbnail_lock} />
                  </div>
                </td>
                <td className="py-3 px-2 text-center">
                  <div className="flex justify-center">
                    <StageIcon completed={video.stages.filmed} />
                  </div>
                </td>
                <td className="py-3 px-2 text-center">
                  <div className="flex justify-center">
                    <StageIcon completed={video.stages.edited} />
                  </div>
                </td>
                <td className="py-3 px-2 text-center">
                  <div className="flex justify-center">
                    <StageIcon completed={video.stages.scheduled} />
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {video.publishDate
                    ? new Date(video.publishDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'TBD'}
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground max-w-xs">
                  {video.blocking}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {data.videos.map(video => (
          <Card key={video.id}>
            <CardContent className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-semibold">{video.id}</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                        PILLAR_COLORS[video.pillar] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }`}
                    >
                      {video.pillar}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium">{video.title}</h3>
                </div>
              </div>

              {/* Stage Grid */}
              <div className="grid grid-cols-4 gap-2">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Docket</span>
                  <StageIcon completed={video.stages.docket} />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Takes</span>
                  <StageIcon completed={video.stages.takes} />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Script</span>
                  <StageIcon completed={video.stages.script} />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">T/T Lock</span>
                  <StageIcon completed={video.stages.title_thumbnail_lock} />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Filmed</span>
                  <StageIcon completed={video.stages.filmed} />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Edited</span>
                  <StageIcon completed={video.stages.edited} />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Scheduled</span>
                  <StageIcon completed={video.stages.scheduled} />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Publish</span>
                  <span className="text-[10px] text-muted-foreground">
                    {video.publishDate
                      ? new Date(video.publishDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'TBD'}
                  </span>
                </div>
              </div>

              {/* Blocking */}
              <div className="pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground font-medium">Blocking: </span>
                <span className="text-xs text-muted-foreground">{video.blocking}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
