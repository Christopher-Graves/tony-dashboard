import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DOCKETS_PATH = process.env.DOCKETS_PATH || 'C:\\Users\\chris\\.openclaw\\workspace-youtube\\dockets';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const docketPath = path.join(DOCKETS_PATH, slug);

    if (!fs.existsSync(docketPath)) {
      return NextResponse.json({ error: 'Docket not found' }, { status: 404 });
    }

    const metaPath = path.join(docketPath, 'meta.json');
    if (!fs.existsSync(metaPath)) {
      return NextResponse.json({ error: 'Invalid docket: meta.json missing' }, { status: 404 });
    }

    const raw = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

    // Normalize status values from pipeline
    const STATUS_MAP: Record<string, string> = {
      'research-complete': 'research-review',
      'research_complete': 'research-review',
      'research_review': 'research-review',
      'chris_notes': 'chris-notes',
      'ready_to_shoot': 'ready-to-shoot',
    };
    const normalizedStatus = STATUS_MAP[raw.status] || raw.status || 'research-review';

    const meta = {
      status: normalizedStatus,
      ethanScore: raw.ethanScore ?? raw.ethan_score ?? null,
      notionUrl: raw.notionUrl ?? raw.notion_url ?? null,
      createdAt: raw.createdAt || raw.date || slug.slice(0, 10),
      updatedAt: raw.updatedAt || raw.createdAt || raw.date || slug.slice(0, 10),
      topic: raw.topic || raw.title || 'Untitled',
      angle: raw.angle || raw.pillar || '',
    };

    const readFile = (filename: string): string | null => {
      const filePath = path.join(docketPath, filename);
      if (!fs.existsSync(filePath)) return null;
      return fs.readFileSync(filePath, 'utf-8');
    };

    // Check for both DOCKET.md (legacy) and research-docket.md (new)
    const researchDocket = readFile('research-docket.md') || readFile('DOCKET.md') || '';

    return NextResponse.json({
      slug,
      meta,
      researchDocket,
      chrisNotes: readFile('chris-notes.md') || '',
      titles: readFile('titles.md'),
      thumbnailConcepts: readFile('thumbnail-concepts.md'),
      scriptOutline: readFile('script-outline.md'),
      brollShotlist: readFile('broll-shotlist.md'),
    });
  } catch (error) {
    console.error('Error reading docket:', error);
    return NextResponse.json({ error: 'Failed to read docket' }, { status: 500 });
  }
}
