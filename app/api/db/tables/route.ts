import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Dynamic import to avoid crash if pg isn't configured
    const { getTables } = await import('@/lib/db');
    const tables = await getTables();
    return NextResponse.json(tables);
  } catch (error: any) {
    const msg = String(error?.message || error);
    
    // Friendly error for auth failures
    if (msg.includes('password') || msg.includes('authentication')) {
      return NextResponse.json(
        { error: 'Database authentication failed. Set PGPASSWORD in .env.local', details: msg },
        { status: 503 }
      );
    }
    if (msg.includes('ECONNREFUSED') || msg.includes('timeout')) {
      return NextResponse.json(
        { error: 'Cannot connect to PostgreSQL. Is it running?', details: msg },
        { status: 503 }
      );
    }

    console.error('Error fetching tables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch database tables', details: msg },
      { status: 500 }
    );
  }
}
