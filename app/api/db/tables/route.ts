import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { getTables } = await import('@/lib/db');
    const tables = await getTables();
    return NextResponse.json(tables);
  } catch (error: any) {
    const msg = String(error?.message || error);
    
    if (msg.includes('Cannot find module') || msg.includes('@/lib/db')) {
      return NextResponse.json(
        { error: 'Database not configured. Create lib/db.ts with PostgreSQL connection.', tables: [] },
        { status: 200 }
      );
    }
    if (msg.includes('password') || msg.includes('authentication')) {
      return NextResponse.json({ error: 'Database authentication failed.', tables: [] }, { status: 200 });
    }
    if (msg.includes('ECONNREFUSED') || msg.includes('timeout')) {
      return NextResponse.json({ error: 'Cannot connect to PostgreSQL.', tables: [] }, { status: 200 });
    }

    return NextResponse.json({ error: 'Database error: ' + msg, tables: [] }, { status: 200 });
  }
}
