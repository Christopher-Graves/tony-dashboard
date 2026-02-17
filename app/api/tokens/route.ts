import { NextResponse } from 'next/server';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const SESSIONS_DIR = 'C:\\Users\\chris\\.openclaw\\sessions';

interface TokenUsage {
  agentId: string;
  agentName: string;
  totalTokens: number;
  sessions: Array<{
    sessionId: string;
    tokens: number;
    lastActivity: string;
  }>;
}

export async function GET() {
  try {
    const tokenUsage: Record<string, TokenUsage> = {};

    // Read all session directories
    try {
      const agents = readdirSync(SESSIONS_DIR);
      
      for (const agentId of agents) {
        const agentDir = join(SESSIONS_DIR, agentId);
        const stat = statSync(agentDir);
        
        if (!stat.isDirectory()) continue;

        tokenUsage[agentId] = {
          agentId,
          agentName: agentId,
          totalTokens: 0,
          sessions: [],
        };

        // Read session files
        const sessions = readdirSync(agentDir);
        for (const sessionFile of sessions) {
          if (!sessionFile.endsWith('.json')) continue;
          
          try {
            const sessionPath = join(agentDir, sessionFile);
            const sessionData = readFileSync(sessionPath, 'utf-8');
            const session = JSON.parse(sessionData);
            
            const tokens = session.usage?.totalTokens || 0;
            tokenUsage[agentId].totalTokens += tokens;
            tokenUsage[agentId].sessions.push({
              sessionId: sessionFile.replace('.json', ''),
              tokens,
              lastActivity: session.lastActivity || session.createdAt,
            });
          } catch (err) {
            console.warn(`Error reading session ${sessionFile}:`, err);
          }
        }
      }
    } catch (err) {
      console.warn('Error reading sessions directory:', err);
    }

    return NextResponse.json(Object.values(tokenUsage));
  } catch (error) {
    console.error('Error fetching token usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token usage' },
      { status: 500 }
    );
  }
}
