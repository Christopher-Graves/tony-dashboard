import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

export const runtime = 'nodejs';

const OPENCLAW_ROOT = join(homedir(), '.openclaw');

interface Identity {
  emoji?: string;
  role?: string;
  description?: string;
  raw?: string;
}

async function parseIdentityFile(content: string): Promise<Identity> {
  const identity: Identity = { raw: content };
  
  // Extract emoji (usually at the top or in a heading)
  const emojiMatch = content.match(/(?:^|\n)([🔧🎨📊🛡️🔔💰🔍🧪📝🎯🌐🤖])/);
  if (emojiMatch) identity.emoji = emojiMatch[1];
  
  // Extract role from headings or "Role:" lines
  const roleMatch = content.match(/(?:^|\n)##?\s*(.+?)(?:\n|$)/) || 
                    content.match(/Role:\s*(.+?)(?:\n|$)/i);
  if (roleMatch) identity.role = roleMatch[1].trim();
  
  // Extract first paragraph as description
  const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  if (lines.length > 0) {
    identity.description = lines[0].trim().substring(0, 200);
  }
  
  return identity;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent');
    
    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing agent parameter' },
        { status: 400 }
      );
    }
    
    const workspacePath = join(OPENCLAW_ROOT, `workspace-${agentId}`);
    const identityPath = join(workspacePath, 'IDENTITY.md');
    
    try {
      const content = await readFile(identityPath, 'utf-8');
      const identity = await parseIdentityFile(content);
      
      return NextResponse.json(identity);
    } catch (err) {
      // IDENTITY.md doesn't exist - return minimal info
      return NextResponse.json({
        emoji: '🤖',
        role: agentId,
        description: `Agent ${agentId}`,
      });
    }
  } catch (error) {
    console.error('[identity] API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch identity', details: String(error) },
      { status: 500 }
    );
  }
}
