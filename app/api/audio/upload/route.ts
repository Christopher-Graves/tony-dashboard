import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const TRANSCRIPTS_DIR = 'C:\\Users\\chris\\.openclaw\\workspace\\audio-transcripts';
const UPLOADS_DIR = join(TRANSCRIPTS_DIR, 'uploads');

function extractItems(transcript: string) {
  const lines = transcript.split(/[.!?]+/).map(l => l.trim()).filter(Boolean);
  
  const tasks: string[] = [];
  const ideas: string[] = [];
  const goals: string[] = [];
  const plans: string[] = [];
  const memories: string[] = [];
  
  const taskKeywords = ['need to', 'have to', 'must', 'should', 'todo', 'task'];
  const ideaKeywords = ['idea', 'what if', 'maybe', 'could', 'thinking about'];
  const goalKeywords = ['goal', 'want to', 'aim', 'target', 'achieve'];
  const planKeywords = ['plan', 'going to', 'will', 'planning'];
  const memoryKeywords = ['remember', 'do not forget', 'note', 'important'];
  
  for (const line of lines) {
    const lower = line.toLowerCase();
    
    if (taskKeywords.some(kw => lower.includes(kw))) {
      tasks.push(line);
    }
    if (ideaKeywords.some(kw => lower.includes(kw))) {
      ideas.push(line);
    }
    if (goalKeywords.some(kw => lower.includes(kw))) {
      goals.push(line);
    }
    if (planKeywords.some(kw => lower.includes(kw))) {
      plans.push(line);
    }
    if (memoryKeywords.some(kw => lower.includes(kw))) {
      memories.push(line);
    }
  }
  
  return { tasks, ideas, goals, plans, memories };
}

export async function POST(request: NextRequest) {
  try {
    if (!existsSync(TRANSCRIPTS_DIR)) {
      await mkdir(TRANSCRIPTS_DIR, { recursive: true });
    }
    if (!existsSync(UPLOADS_DIR)) {
      await mkdir(UPLOADS_DIR, { recursive: true });
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    const timestamp = Date.now();
    const filename = 'audio_'+timestamp+'_'+file.name;
    const filepath = join(UPLOADS_DIR, filename);
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);
    
    const transcriptResult = await new Promise<any>((resolve, reject) => {
      const pythonPath = 'python';
      const scriptPath = join(process.cwd(), 'tony-tools', 'transcribe.py');
      
      const proc = spawn(pythonPath, [scriptPath, filepath]);
      
      let stdout = '';
      let stderr = '';
      
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error('Transcription failed: '+stderr));
        } else {
          try {
            resolve(JSON.parse(stdout));
          } catch (e) {
            reject(new Error('Failed to parse transcription output: '+stdout));
          }
        }
      });
    });
    
    if (!transcriptResult.success) {
      return NextResponse.json({ error: transcriptResult.error }, { status: 500 });
    }
    
    const extracted = extractItems(transcriptResult.transcript);
    
    const transcriptData = {
      id: timestamp,
      filename: file.name,
      filepath,
      timestamp: new Date().toISOString(),
      transcript: transcriptResult.transcript,
      language: transcriptResult.language,
      duration: transcriptResult.duration,
      segments: transcriptResult.segments,
      extracted
    };
    
    const transcriptFilepath = join(TRANSCRIPTS_DIR, 'transcript_'+timestamp+'.json');
    await writeFile(transcriptFilepath, JSON.stringify(transcriptData, null, 2));
    
    return NextResponse.json({
      success: true,
      transcript: transcriptResult.transcript,
      extracted,
      metadata: {
        duration: transcriptResult.duration,
        language: transcriptResult.language,
        segments: transcriptResult.segments
      }
    });
    
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}