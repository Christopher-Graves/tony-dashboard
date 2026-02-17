import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

const OPENCLAW_CONFIG_PATH = 'C:\\Users\\chris\\.openclaw\\openclaw.json';
const GATEWAY_URL = 'http://localhost:18789';
const SESSIONS_DIR = 'C:\\Users\\chris\\.openclaw\\sessions';

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
    
    const agents: Agent[] = config.agents.list.map((agent: any) => ({
      id: agent.id,
      name: agent.name || agent.id,
      workspace: agent.workspace,
      status: 'idle' as const,
      lastActivity: undefined,
      tokenCount: 0,
      sessionId: undefined,
    }));

    // Try to enhance with session data from gateway
    try {
      const token = config.gateway?.auth?.token || '';
      const response = await fetch(`${GATEWAY_URL}/api/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.ok) {
        const sessions = await response.json();
        
        // Update agent status from sessions
        sessions.forEach((session: any) => {
          const agent = agents.find(a => a.id === session.agentId);
          if (agent) {
            agent.status = session.status || 'active';
            agent.lastActivity = session.lastActivity;
            agent.tokenCount = session.tokenCount || 0;
            agent.sessionId = session.id;
          }
        });
      }
    } catch (err) {
      console.warn('Could not fetch session data from gateway:', err);
    }

    return NextResponse.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}
