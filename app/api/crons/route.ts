import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';

const OPENCLAW_CONFIG_PATH = 'C:\\Users\\chris\\.openclaw\\openclaw.json';
const GATEWAY_URL = 'http://localhost:18789';

export async function GET() {
  try {
    const configData = readFileSync(OPENCLAW_CONFIG_PATH, 'utf-8');
    const config = JSON.parse(configData);
    const token = config.gateway?.auth?.token || '';

    const response = await fetch(`${GATEWAY_URL}/api/crons`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Gateway returned ${response.status}`);
    }

    const crons = await response.json();
    return NextResponse.json(crons);
  } catch (error) {
    console.error('Error fetching crons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cron jobs', details: String(error) },
      { status: 500 }
    );
  }
}
