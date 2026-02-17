import { NextResponse } from 'next/server';
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// OpenClaw stores session/log data in various places.
// Try multiple approaches to find token usage data.

const OPENCLAW_DIR = join(homedir(), '.openclaw');
const LOG_DIR = join('C:', 'tmp', 'openclaw');

interface TokenUsage {
  agentId: string;
  agentName: string;
  totalTokens: number;
  sessions: Array<{ sessionId: string; tokens: number; lastActivity: string }>;
}

function getAgentNames(): Record<string, string> {
  try {
    const config = JSON.parse(readFileSync(join(OPENCLAW_DIR, 'openclaw.json'), 'utf-8'));
    const map: Record<string, string> = {};
    for (const agent of config.agents?.list || []) {
      map[agent.id] = agent.name || agent.id;
    }
    return map;
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    const names = getAgentNames();
    
    // Try to read from workspace session data or logs
    const usage: TokenUsage[] = Object.entries(names).map(([id, name]) => ({
      agentId: id,
      agentName: name,
      totalTokens: 0,
      sessions: [],
    }));

    // Check for any session directories
    const possibleSessionDirs = [
      join(OPENCLAW_DIR, 'sessions'),
      join(OPENCLAW_DIR, 'data', 'sessions'),
    ];

    for (const dir of possibleSessionDirs) {
      if (!existsSync(dir)) continue;
      
      try {
        const agents = readdirSync(dir);
        for (const agentId of agents) {
          const agentDir = join(dir, agentId);
          if (!statSync(agentDir).isDirectory()) continue;

          let entry = usage.find(u => u.agentId === agentId);
          if (!entry) {
            entry = { agentId, agentName: names[agentId] || agentId, totalTokens: 0, sessions: [] };
            usage.push(entry);
          }

          const sessions = readdirSync(agentDir).filter(f => f.endsWith('.json'));
          for (const sf of sessions) {
            try {
              const data = JSON.parse(readFileSync(join(agentDir, sf), 'utf-8'));
              const tokens = data.usage?.totalTokens || data.tokenCount || 0;
              entry.totalTokens += tokens;
              entry.sessions.push({
                sessionId: sf.replace('.json', ''),
                tokens,
                lastActivity: data.lastActivity || data.updatedAt || '',
              });
            } catch {}
          }
        }
      } catch {}
    }

    return NextResponse.json(usage);
  } catch (error) {
    console.error('Error fetching token usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token usage' },
      { status: 500 }
    );
  }
}
