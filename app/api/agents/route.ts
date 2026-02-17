import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const OPENCLAW_CONFIG_PATH = 'C:\\Users\\chris\\.openclaw\\openclaw.json';
const AGENTS_DIR = join(homedir(), '.openclaw', 'agents');

interface Agent {
  id: string;
  name: string;
  workspace: string;
  status: 'active' | 'idle' | 'error';
  lastActivity?: string;
  tokenCount?: number;
  sessionId?: string;
}

export async function GET() {
  try {
    // Read agent config
    const configData = readFileSync(OPENCLAW_CONFIG_PATH, 'utf-8');
    const config = JSON.parse(configData);
    
    const agents: Agent[] = config.agents.list.map((agent: any) => {
      const agentData: Agent = {
        id: agent.id,
        name: agent.name || agent.id,
        workspace: agent.workspace,
        status: 'idle' as const,
        lastActivity: undefined,
        tokenCount: 0,
        sessionId: undefined,
      };

      // Read real token data from agents directory
      try {
        const sessionsFile = join(AGENTS_DIR, agent.id, 'sessions', 'sessions.json');
        if (existsSync(sessionsFile)) {
          const sessions = JSON.parse(readFileSync(sessionsFile, 'utf-8'));
          let totalTokens = 0;
          let latestActivity = 0;
          let mainSessionId: string | undefined;

          for (const [key, session] of Object.entries(sessions) as [string, any][]) {
            totalTokens += session.totalTokens || 0;
            if (session.updatedAt && session.updatedAt > latestActivity) {
              latestActivity = session.updatedAt;
              mainSessionId = session.sessionId;
            }
          }

          agentData.tokenCount = totalTokens;
          if (latestActivity > 0) {
            agentData.lastActivity = new Date(latestActivity).toISOString();
            // Consider "active" if updated in last 5 minutes
            agentData.status = (Date.now() - latestActivity < 5 * 60 * 1000) ? 'active' : 'idle';
          }
          agentData.sessionId = mainSessionId;
        }
      } catch (err) {
        console.warn(`Could not read session data for ${agent.id}:`, err);
      }

      return agentData;
    });

    return NextResponse.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}
