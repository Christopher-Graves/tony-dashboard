import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { getTableSchema, getTableData } = await import('@/lib/db');
    const { table } = await request.json();
    if (!table) return NextResponse.json({ error: 'Table name required' }, { status: 400 });
    const [schema, data] = await Promise.all([getTableSchema(table), getTableData(table)]);
    return NextResponse.json({ schema, data });
  } catch (error: any) {
    const msg = String(error?.message || error);
    if (msg.includes('Cannot find module')) {
      return NextResponse.json({ error: 'Database not configured', schema: [], data: [] }, { status: 200 });
    }
    return NextResponse.json({ error: 'Database error: ' + msg }, { status: 500 });
  }
}
