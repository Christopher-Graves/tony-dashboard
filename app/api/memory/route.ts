import { NextResponse } from 'next/server';
import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

export const runtime = 'nodejs';

interface MemoryFile {
  path: string;
  agent: string;
  filename: string;
  content: string;
  mtime: string;
  size: number;
}

const OPENCLAW_ROOT = join(homedir(), '.openclaw');

async function findMemoryFiles(): Promise<MemoryFile[]> {
  const memories: MemoryFile[] = [];
  
  try {
    // Read all workspace-* directories
    const entries = await readdir(OPENCLAW_ROOT, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith('workspace-')) {
        continue;
      }
      
      const agentName = entry.name.replace('workspace-', '');
      const workspacePath = join(OPENCLAW_ROOT, entry.name);
      
      // Check for MEMORY.md in root
      try {
        const memoryMdPath = join(workspacePath, 'MEMORY.md');
        const memStat = await stat(memoryMdPath);
        const content = await readFile(memoryMdPath, 'utf-8');
        
        memories.push({
          path: memoryMdPath,
          agent: agentName,
          filename: 'MEMORY.md',
          content,
          mtime: memStat.mtime.toISOString(),
          size: memStat.size,
        });
      } catch (err) {
        // MEMORY.md doesn't exist - skip
      }
      
      // Check for memory/ directory
      try {
        const memoryDir = join(workspacePath, 'memory');
        const memoryFiles = await readdir(memoryDir, { withFileTypes: true });
        
        for (const memFile of memoryFiles) {
          if (!memFile.isFile() || !memFile.name.endsWith('.md')) {
            continue;
          }
          
          try {
            const filePath = join(memoryDir, memFile.name);
            const fileStat = await stat(filePath);
            const content = await readFile(filePath, 'utf-8');
            
            memories.push({
              path: filePath,
              agent: agentName,
              filename: memFile.name,
              content,
              mtime: fileStat.mtime.toISOString(),
              size: fileStat.size,
            });
          } catch (err) {
            console.warn(`[memory] Error reading ${memFile.name}:`, err);
          }
        }
      } catch (err) {
        // memory/ directory doesn't exist - skip
      }
    }
  } catch (error) {
    console.error('[memory] Error scanning workspaces:', error);
    throw error;
  }
  
  return memories;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('q')?.toLowerCase();
    const agentFilter = searchParams.get('agent')?.toLowerCase();
    
    let memories = await findMemoryFiles();
    
    // Apply agent filter
    if (agentFilter) {
      memories = memories.filter(m => m.agent.toLowerCase() === agentFilter);
    }
    
    // Apply search filter
    if (searchQuery) {
      memories = memories.filter(m => {
        const contentLower = m.content.toLowerCase();
        const filenameLower = m.filename.toLowerCase();
        return contentLower.includes(searchQuery) || filenameLower.includes(searchQuery);
      });
    }
    
    // Sort by modification time (newest first)
    memories.sort((a, b) => {
      return new Date(b.mtime).getTime() - new Date(a.mtime).getTime();
    });
    
    return NextResponse.json(memories);
  } catch (error) {
    console.error('[memory] API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch memories', details: String(error) },
      { status: 500 }
    );
  }
}
