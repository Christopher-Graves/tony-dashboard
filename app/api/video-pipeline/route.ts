import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DOCKETS_PATH = process.env.DOCKETS_PATH || 'C:\\Users\\chris\\.openclaw\\workspace-youtube\\dockets';

interface DocketMeta {
  status: 'research-review' | 'chris-notes' | 'production' | 'ready-to-shoot' | 'shot' | 'published';
  ethanScore: number | null;
  notionUrl: string | null;
  createdAt: string;
  updatedAt: string;
  topic: string;
  angle: string;
}

interface DocketSummary {
  slug: string;
  topic: string;
  status: string;
  ethanScore: number | null;
  createdAt: string;
  hasNotes: boolean;
}

export async function GET() {
  try {
    if (!fs.existsSync(DOCKETS_PATH)) {
      return NextResponse.json({ dockets: [] });
    }

    const entries = fs.readdirSync(DOCKETS_PATH, { withFileTypes: true });
    const dockets: DocketSummary[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const docketPath = path.join(DOCKETS_PATH, entry.name);
      const metaPath = path.join(docketPath, 'meta.json');

      if (!fs.existsSync(metaPath)) continue;

      const metaContent = fs.readFileSync(metaPath, 'utf-8');
      const raw = JSON.parse(metaContent);

      // Normalize: support both snake_case (pipeline output) and camelCase
      const meta: DocketMeta = {
        status: raw.status || 'research-review',
        ethanScore: raw.ethanScore ?? raw.ethan_score ?? null,
        notionUrl: raw.notionUrl ?? raw.notion_url ?? null,
        createdAt: raw.createdAt || raw.date || entry.name.slice(0, 10),
        updatedAt: raw.updatedAt || raw.createdAt || raw.date || entry.name.slice(0, 10),
        topic: raw.topic || raw.title || 'Untitled',
        angle: raw.angle || raw.pillar || '',
      };

      // Normalize status values (pipeline uses different strings)
      const STATUS_MAP: Record<string, string> = {
        'research-complete': 'research-review',
        'research_complete': 'research-review',
        'research_review': 'research-review',
        'chris_notes': 'chris-notes',
        'ready_to_shoot': 'ready-to-shoot',
      };
      if (STATUS_MAP[meta.status]) {
        meta.status = STATUS_MAP[meta.status] as DocketMeta['status'];
      }

      const notesPath = path.join(docketPath, 'chris-notes.md');
      const hasNotes = fs.existsSync(notesPath) && fs.readFileSync(notesPath, 'utf-8').trim().length > 0;

      dockets.push({
        slug: entry.name,
        topic: meta.topic,
        status: meta.status,
        ethanScore: meta.ethanScore,
        createdAt: meta.createdAt,
        hasNotes,
      });
    }

    // Sort by created date (newest first)
    dockets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ dockets });
  } catch (error) {
    console.error('Error reading dockets:', error);
    return NextResponse.json({ error: 'Failed to read dockets' }, { status: 500 });
  }
}
