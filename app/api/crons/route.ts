import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';

const CACHE_PATH = 'C:\\Users\\chris\\.openclaw\\workspace\\tony-dashboard\\.cron-cache.json';

export async function GET() {
  try {
    if (!existsSync(CACHE_PATH)) {
      return NextResponse.json([]);
    }

    const raw = JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
    const jobs = raw.jobs || raw;

    // Transform to the shape the frontend expects
    const transformed = jobs.map((job: any) => {
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
        model: payload.model || undefined,
        lastRun: state.lastRunAtMs ? new Date(state.lastRunAtMs).toISOString() : undefined,
        nextRun: state.nextRunAtMs ? new Date(state.nextRunAtMs).toISOString() : undefined,
        status: state.lastStatus || 'unknown',
        lastError: state.lastError || undefined,
        enabled: job.enabled !== false,
        sessionTarget: job.sessionTarget,
        deleteAfterRun: job.deleteAfterRun || false,
      };
    });

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Error fetching crons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cron jobs', details: String(error) },
      { status: 500 }
    );
  }
}
