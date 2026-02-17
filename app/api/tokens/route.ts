import { NextResponse } from 'next/server';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const AGENTS_DIR = join(homedir(), '.openclaw', 'agents');
const CONFIG_PATH = join(homedir(), '.openclaw', 'openclaw.json');

interface SessionInfo {
  sessionId: string;
  key: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model?: string;
  lastActivity: string;
}

interface AgentUsage {
  agentId: string;
  agentName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  sessionCount: number;
  sessions: SessionInfo[];
}

function getAgentNames(): Record<string, string> {
  try {
    const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
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
    const usage: AgentUsage[] = [];

    if (!existsSync(AGENTS_DIR)) {
      return NextResponse.json([]);
    }

    const agentDirs = readdirSync(AGENTS_DIR);

    for (const agentId of agentDirs) {
      const sessionsFile = join(AGENTS_DIR, agentId, 'sessions', 'sessions.json');
      if (!existsSync(sessionsFile)) continue;

      try {
        const data = JSON.parse(readFileSync(sessionsFile, 'utf-8'));
        const agent: AgentUsage = {
          agentId,
          agentName: names[agentId] || agentId,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          sessionCount: 0,
          sessions: [],
        };

        for (const [key, session] of Object.entries(data) as [string, any][]) {
          const input = session.inputTokens || 0;
          const output = session.outputTokens || 0;
          const total = session.totalTokens || (input + output);

          agent.inputTokens += input;
          agent.outputTokens += output;
          agent.totalTokens += total;
          agent.sessionCount++;

          // Only include sessions with actual token usage
          if (total > 0) {
            agent.sessions.push({
              sessionId: session.sessionId || key,
              key,
              inputTokens: input,
              outputTokens: output,
              totalTokens: total,
              model: session.model,
              lastActivity: session.updatedAt ? new Date(session.updatedAt).toISOString() : '',
            });
          }
        }

        // Sort sessions by tokens descending
        agent.sessions.sort((a, b) => b.totalTokens - a.totalTokens);

        usage.push(agent);
      } catch (err) {
        console.warn(`Error reading sessions for ${agentId}:`, err);
      }
    }

    // Sort agents by total tokens descending
    usage.sort((a, b) => b.totalTokens - a.totalTokens);

    return NextResponse.json(usage);
  } catch (error) {
    console.error('Error fetching token usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token usage' },
      { status: 500 }
    );
  }
}
