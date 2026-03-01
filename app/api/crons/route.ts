import { NextResponse } from 'next/server';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const CACHE_PATH = 'C:\\Users\\chris\\.openclaw\\workspace\\tony-dashboard\\.cron-cache.json';

// In-memory cache with TTL
let memCache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 60_000; // 60 seconds — crons don't change often
let refreshing = false;

function fetchLiveCrons(): any[] {
  try {
    const output = execSync('openclaw cron list --json 2>nul', {
      encoding: 'utf-8',
      timeout: 15000,
      windowsHide: true,
    });
    const jsonStart = output.indexOf('{');
    if (jsonStart >= 0) {
      const data = JSON.parse(output.substring(jsonStart));
      const jobs = data.jobs || data;
      try {
        writeFileSync(CACHE_PATH, JSON.stringify({ updatedAt: Date.now(), jobs }, null, 2));
      } catch { /* ignore */ }
      return jobs;
    }
  } catch (err) {
    console.warn('[crons] CLI fetch failed, using cache:', err);
  }

  if (existsSync(CACHE_PATH)) {
    const raw = JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
    return raw.jobs || raw;
  }
  return [];
}

function transformJob(job: any) {
  const schedule = job.schedule || {};
  let scheduleStr = '';
  if (schedule.kind === 'cron') scheduleStr = schedule.expr + (schedule.tz ? ` (${schedule.tz})` : '');
  else if (schedule.kind === 'every') scheduleStr = `Every ${Math.round((schedule.everyMs || 0) / 60000)}m`;
  else if (schedule.kind === 'at') scheduleStr = `Once at ${schedule.at}`;

  const state = job.state || {};
  const payload = job.payload || {};

  return {
    id: job.id,
    name: job.name || job.id,
    schedule: scheduleStr,
    scheduleRaw: schedule,
    model: payload.model || undefined,
    lastRun: state.lastRunAtMs ? new Date(state.lastRunAtMs).toISOString() : undefined,
    nextRun: state.nextRunAtMs ? new Date(state.nextRunAtMs).toISOString() : undefined,
    status: state.lastStatus || 'unknown',
    lastError: state.lastError || undefined,
    enabled: job.enabled !== false,
    sessionTarget: job.sessionTarget,
    agentId: job.agentId,
    deleteAfterRun: job.deleteAfterRun || false,
  };
}

function refreshInBackground() {
  if (refreshing) return;
  refreshing = true;
  // Run in next tick to not block response
  setTimeout(() => {
    try {
      const jobs = fetchLiveCrons();
      memCache = { data: jobs.map(transformJob), timestamp: Date.now() };
    } catch { /* keep stale */ }
    refreshing = false;
  }, 0);
}

export async function GET() {
  try {
    // Return cached if fresh
    if (memCache && (Date.now() - memCache.timestamp) < CACHE_TTL_MS) {
      return NextResponse.json(memCache.data);
    }

    // Stale cache: return immediately, refresh in background
    if (memCache) {
      refreshInBackground();
      return NextResponse.json(memCache.data);
    }

    // No cache: must fetch (slow first load)
    const jobs = fetchLiveCrons();
    const transformed = jobs.map(transformJob);
    memCache = { data: transformed, timestamp: Date.now() };
    return NextResponse.json(transformed);
  } catch (error) {
    console.error('[crons] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch cron jobs', details: String(error) }, { status: 500 });
  }
}
