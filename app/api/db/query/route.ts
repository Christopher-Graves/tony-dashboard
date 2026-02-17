import { NextResponse } from 'next/server';
import { getTableSchema, getTableData } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { table } = await request.json();

    if (!table) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }

    const [schema, data] = await Promise.all([
      getTableSchema(table),
      getTableData(table),
    ]);

    return NextResponse.json({ schema, data });
  } catch (error) {
    console.error('Error querying database:', error);
    return NextResponse.json(
      { error: 'Failed to query database', details: String(error) },
      { status: 500 }
    );
  }
}
