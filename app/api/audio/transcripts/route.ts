import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const TRANSCRIPTS_DIR = 'C:\\Users\\chris\\.openclaw\\workspace\\audio-transcripts';

export async function GET() {
  try {
    if (!existsSync(TRANSCRIPTS_DIR)) {
      return NextResponse.json({ transcripts: [] });
    }
    
    const files = await readdir(TRANSCRIPTS_DIR);
    const transcriptFiles = files.filter(f => f.startsWith('transcript_') && f.endsWith('.json'));
    
    const transcripts = await Promise.all(
      transcriptFiles.map(async (filename) => {
        const filepath = join(TRANSCRIPTS_DIR, filename);
        const content = await readFile(filepath, 'utf-8');
        return JSON.parse(content);
      })
    );
    
    transcripts.sort((a, b) => b.id - a.id);
    
    return NextResponse.json({ transcripts });
    
  } catch (error: any) {
    console.error('Transcripts list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}