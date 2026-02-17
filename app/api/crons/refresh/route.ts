import { NextResponse } from 'next/server';
import { writeFileSync } from 'fs';

const CACHE_PATH = 'C:\\Users\\chris\\.openclaw\\workspace\\tony-dashboard\\.cron-cache.json';

// POST body: { jobs: [...] }
// Called by Tony or a script to refresh the cron cache
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const jobs = body.jobs || body;
    
    if (!Array.isArray(jobs)) {
      return NextResponse.json({ error: 'Expected { jobs: [...] } or an array' }, { status: 400 });
    }

    writeFileSync(CACHE_PATH, JSON.stringify({ updatedAt: Date.now(), jobs }, null, 2));
    return NextResponse.json({ ok: true, count: jobs.length });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
