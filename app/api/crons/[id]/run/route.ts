import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';

const OPENCLAW_CONFIG_PATH = 'C:\\Users\\chris\\.openclaw\\openclaw.json';
const GATEWAY_URL = 'http://localhost:18789';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const configData = readFileSync(OPENCLAW_CONFIG_PATH, 'utf-8');
    const config = JSON.parse(configData);
    const token = config.gateway?.auth?.token || '';

    const response = await fetch(`${GATEWAY_URL}/api/crons/${id}/trigger`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Gateway returned ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error triggering cron:', error);
    return NextResponse.json(
      { error: 'Failed to trigger cron job', details: String(error) },
      { status: 500 }
    );
  }
}
