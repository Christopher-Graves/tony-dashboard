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
    const docketPath = path.join(DOCKETS_PATH, slug);

    if (!fs.existsSync(docketPath)) {
      return NextResponse.json({ error: 'Docket not found' }, { status: 404 });
    }

    // Read research docket and chris notes
    const researchDocketPath = path.join(docketPath, 'research-docket.md');
    const chrisNotesPath = path.join(docketPath, 'chris-notes.md');
    
    let researchDocket = '';
    let chrisNotes = '';
    
    if (fs.existsSync(researchDocketPath)) {
      researchDocket = fs.readFileSync(researchDocketPath, 'utf-8');
    }
    
    if (fs.existsSync(chrisNotesPath)) {
      chrisNotes = fs.readFileSync(chrisNotesPath, 'utf-8');
    }

    // Read meta.json to get topic
    const metaPath = path.join(docketPath, 'meta.json');
    let meta: any = {};
    let topic = '';
    
    if (fs.existsSync(metaPath)) {
      meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      topic = meta.topic || '';
    }

    // Write phase2-trigger.json
    const triggerData = {
      triggered: true,
      triggeredAt: new Date().toISOString(),
      slug,
      topic
    };
    
    const triggerPath = path.join(docketPath, 'phase2-trigger.json');
    fs.writeFileSync(triggerPath, JSON.stringify(triggerData, null, 2), 'utf-8');

    // Create phase2-instructions.md
    const instructions = `# Phase 2 Instructions

## Topic
${topic}

## What to Produce

Phase 2 should create the following deliverables:

1. **Title Options** (titles.md) - 10 compelling YouTube title options that maximize CTR
2. **Thumbnail Concepts** (thumbnail-concepts.md) - 3-5 thumbnail concepts with detailed descriptions
3. **Script Outline** (script-outline.md) - Complete script outline with hooks, main points, transitions
4. **B-Roll Shotlist** (broll-shotlist.md) - Comprehensive list of B-roll shots needed for production

---

## Research Docket

${researchDocket}

---

## Chris's Brain Dump

${chrisNotes}
`;

    const instructionsPath = path.join(docketPath, 'phase2-instructions.md');
    fs.writeFileSync(instructionsPath, instructions, 'utf-8');

    // Update meta.json status to production
    meta.status = 'production';
    meta.updatedAt = new Date().toISOString();
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

    return NextResponse.json({ ok: true, message: 'Phase 2 triggered' });
  } catch (error) {
    console.error('Error triggering Phase 2:', error);
    return NextResponse.json({ error: 'Failed to trigger Phase 2' }, { status: 500 });
  }
}
