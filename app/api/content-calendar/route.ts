import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CONTENT_CALENDAR_PATH = path.join(
  'C:',
  'Users',
  'chris',
  '.openclaw',
  'workspace-youtube',
  'content-calendar.json'
);

export async function GET() {
  try {
    if (!fs.existsSync(CONTENT_CALENDAR_PATH)) {
      return NextResponse.json({ videos: [] });
    }

    const data = fs.readFileSync(CONTENT_CALENDAR_PATH, 'utf-8');
    const json = JSON.parse(data);
    
    return NextResponse.json(json);
  } catch (error) {
    console.error('Error reading content calendar:', error);
    return NextResponse.json(
      { error: 'Failed to read content calendar' },
      { status: 500 }
    );
  }
}
