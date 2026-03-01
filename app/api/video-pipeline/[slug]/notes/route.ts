import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DOCKETS_PATH = process.env.DOCKETS_PATH || 'C:\\Users\\chris\\.openclaw\\workspace-youtube\\dockets';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { notes } = await request.json();

    const docketPath = path.join(DOCKETS_PATH, slug);
    if (!fs.existsSync(docketPath)) {
      return NextResponse.json({ error: 'Docket not found' }, { status: 404 });
    }

    // Write notes
    const notesPath = path.join(docketPath, 'chris-notes.md');
    fs.writeFileSync(notesPath, notes, 'utf-8');

    // Update meta.json updatedAt
    const metaPath = path.join(docketPath, 'meta.json');
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      meta.updatedAt = new Date().toISOString();
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error saving notes:', error);
    return NextResponse.json({ error: 'Failed to save notes' }, { status: 500 });
  }
}
