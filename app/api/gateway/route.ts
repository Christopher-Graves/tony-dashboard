import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { homedir } from 'os';
import { join } from 'path';

const execAsync = promisify(exec);
const OPENCLAW = join(homedir(), 'AppData', 'Roaming', 'npm', 'openclaw.cmd');

// In-memory cache with TTL
let cache: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 30_000; // 30 seconds
let refreshing = false;

function parseOutput(output: string) {
  const running = /reachable|agents?\s+\d+/i.test(output);
  const agentMatch = output.match(/Agents\s*[│|]\s*(\d+)/i);
  const sessionMatch = output.match(/sessions\s+(\d+)/i);
  const reachableMatch = output.match(/reachable\s+(\d+ms)/i);
  const updateMatch = output.match(/update.*?(\d{4}\.\d+\.\d+)/i);
  const memoryMatch = output.match(/Memory\s*[│|]\s*(.*?)(?:\s*[│|]|$)/im);
  const secMatch = output.match(/Summary:\s*(.+)/i);

  return {
    status: running ? 'running' : 'stopped',
    agentCount: agentMatch ? parseInt(agentMatch[1]) : null,
    sessionCount: sessionMatch ? parseInt(sessionMatch[1]) : null,
    latency: reachableMatch ? reachableMatch[1] : null,
    version: updateMatch ? updateMatch[1] : null,
    memoryStatus: memoryMatch ? memoryMatch[1].replace(/[^\x20-\x7E]/g, ' ').trim() : null,
    security: secMatch ? secMatch[1].replace(/[^\x20-\x7E]/g, ' ').trim() : null,
    checkedAt: new Date().toISOString(),
  };
}

async function fetchFresh() {
  if (refreshing) return;
  refreshing = true;
  try {
    let output = '';
    try {
      const { stdout, stderr } = await execAsync(`"${OPENCLAW}" status`, { timeout: 15000 });
      output = stdout + stderr;
    } catch (execErr: any) {
      output = (execErr?.stdout || '') + (execErr?.stderr || '');
      if (!output || !/reachable|agents?\s+\d+/i.test(output)) throw execErr;
    }
    const data = parseOutput(output);
    cache = { data, timestamp: Date.now() };
  } catch (err: any) {
    // If we have stale cache, keep it; otherwise set error
    if (!cache) {
      cache = {
        data: { status: 'unreachable', error: String(err), checkedAt: new Date().toISOString() },
        timestamp: Date.now(),
      };
    }
  } finally {
    refreshing = false;
  }
}

export async function GET() {
  // Return cached data if fresh
  if (cache && (Date.now() - cache.timestamp) < CACHE_TTL_MS) {
    return NextResponse.json(cache.data);
  }

  // If we have stale cache, return it immediately and refresh in background
  if (cache) {
    fetchFresh(); // fire and forget
    return NextResponse.json({ ...cache.data, stale: true });
  }

  // No cache at all — must wait
  await fetchFresh();
  return NextResponse.json((cache as any)?.data || { status: 'unreachable', checkedAt: new Date().toISOString() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.action === 'restart') {
      const { stdout, stderr } = await execAsync(`"${OPENCLAW}" gateway restart`, { timeout: 30000 });
      cache = null; // invalidate cache on restart
      return NextResponse.json({ success: true, message: 'Gateway restart initiated', output: (stdout + stderr).trim() });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ success: false, error: error.message || 'Restart failed' }, { status: 500 });
  }
}
