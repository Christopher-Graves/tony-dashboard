'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  nextRun?: string;
  lastRun?: string;
  status: string;
  enabled: boolean;
  agentId?: string;
}

interface DaySlot {
  date: Date;
  jobs: CronJob[];
}

export default function CalendarPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(getStartOfWeek(new Date()));

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    try {
      setLoading(true);
      const res = await fetch('/api/crons');
      if (!res.ok) throw new Error('Failed to fetch cron jobs');
      const data = await res.json();
      setJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Sunday = 0
    return new Date(d.setDate(diff));
  }

  function generateWeek(start: Date): DaySlot[] {
    const week: DaySlot[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      // Filter jobs scheduled for this day
      const dayJobs = jobs.filter(job => {
        if (!job.nextRun || !job.enabled) return false;
        const nextRun = new Date(job.nextRun);
        return nextRun >= date && nextRun <= dayEnd;
      });
      
      week.push({ date, jobs: dayJobs });
    }
    return week;
  }

  function previousWeek() {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() - 7);
    setWeekStart(newStart);
  }

  function nextWeek() {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() + 7);
    setWeekStart(newStart);
  }

  function goToToday() {
    setWeekStart(getStartOfWeek(new Date()));
  }

  const week = generateWeek(weekStart);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function getStatusIcon(status: string) {
    switch (status) {
      case 'success': return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'error': return <XCircle className="h-3 w-3 text-red-500" />;
      default: return <AlertCircle className="h-3 w-3 text-yellow-500" />;
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="h-6 w-6 animate-pulse" />
          <span>Loading calendar...</span>
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
      <div className="border-b border-border bg-card px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 md:gap-3">
            <CalendarDays className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-bold">Cron Calendar</h1>
          </div>
          <div className="text-xs md:text-sm text-muted-foreground">
            {jobs.filter(j => j.enabled).length} active jobs
          </div>
        </div>

        {/* Week navigation */}
        <div className="mt-3 md:mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex gap-2 flex-1 sm:flex-initial">
            <button
              onClick={previousWeek}
              className="rounded-lg border border-border bg-background px-2 sm:px-3 py-1 text-xs sm:text-sm hover:bg-accent flex-1 sm:flex-initial"
            >
              ← <span className="hidden sm:inline">Previous</span>
            </button>
            <button
              onClick={goToToday}
              className="rounded-lg border border-border bg-background px-2 sm:px-3 py-1 text-xs sm:text-sm hover:bg-accent flex-1 sm:flex-initial"
            >
              Today
            </button>
            <button
              onClick={nextWeek}
              className="rounded-lg border border-border bg-background px-2 sm:px-3 py-1 text-xs sm:text-sm hover:bg-accent flex-1 sm:flex-initial"
            >
              <span className="hidden sm:inline">Next</span> →
            </button>
          </div>
          <div className="text-xs sm:text-sm font-medium text-center">
            {week[0].date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto p-3 md:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2 md:gap-4">
          {week.map((day, idx) => {
            const isToday = day.date.toDateString() === new Date().toDateString();
            return (
              <div
                key={idx}
                className={`rounded-lg border ${
                  isToday ? 'border-primary bg-primary/5' : 'border-border bg-card'
                } min-h-[200px] p-3`}
              >
                {/* Day header */}
                <div className="mb-2 border-b border-border pb-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    {dayNames[day.date.getDay()]}
                  </div>
                  <div className={`text-lg font-bold ${isToday ? 'text-primary' : ''}`}>
                    {day.date.getDate()}
                  </div>
                </div>

                {/* Jobs for this day */}
                <div className="space-y-2">
                  {day.jobs.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic">No jobs</div>
                  ) : (
                    day.jobs.map(job => (
                      <div
                        key={job.id}
                        className="rounded border border-border bg-background p-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{job.name}</div>
                            <div className="mt-1 flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {job.nextRun && new Date(job.nextRun).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </div>
                            {job.agentId && (
                              <div className="mt-1 text-muted-foreground">
                                {job.agentId}
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {getStatusIcon(job.status)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* All jobs list below calendar */}
        <div className="mt-8 rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-lg font-bold">All Cron Jobs</h2>
          <div className="space-y-2">
            {jobs.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">No cron jobs found</div>
            ) : (
              jobs.map(job => (
                <div
                  key={job.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <div className="font-medium">{job.name}</div>
                      <div className="text-sm text-muted-foreground">{job.schedule}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {job.agentId && <span>{job.agentId}</span>}
                    {job.nextRun && (
                      <span>Next: {new Date(job.nextRun).toLocaleString()}</span>
                    )}
                    <span className={job.enabled ? 'text-green-500' : 'text-red-500'}>
                      {job.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
