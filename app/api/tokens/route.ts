import { NextResponse } from 'next/server';
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const AGENTS_DIR = join(homedir(), '.openclaw', 'agents');
const CONFIG_PATH = join(homedir(), '.openclaw', 'openclaw.json');

interface AgentUsage {
  agentId: string;
  agentName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  sessionCount: number;
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

function extractUsage(sessionsFile: string): { input: number; output: number; total: number; count: number } {
  let input = 0, output = 0, total = 0, count = 0;
  try {
    const stat = statSync(sessionsFile);
    const raw = readFileSync(sessionsFile, 'utf-8');
    
    if (stat.size > 1_000_000) {
      // Large file: regex extraction
      for (const m of raw.matchAll(/"inputTokens"\s*:\s*(\d+)/g)) input += parseInt(m[1], 10);
      for (const m of raw.matchAll(/"outputTokens"\s*:\s*(\d+)/g)) output += parseInt(m[1], 10);
      for (const m of raw.matchAll(/"totalTokens"\s*:\s*(\d+)/g)) total += parseInt(m[1], 10);
      // Count top-level keys by counting "sessionId" occurrences
      count = (raw.match(/"sessionId"/g) || []).length;
    } else {
      const sessions = JSON.parse(raw);
      for (const [, session] of Object.entries(sessions) as [string, any][]) {
        input += session.inputTokens || 0;
        output += session.outputTokens || 0;
        total += session.totalTokens || (session.inputTokens || 0) + (session.outputTokens || 0);
        count++;
      }
    }
  } catch (err) {
    console.warn(`[tokens] Error reading ${sessionsFile}:`, err);
  }
  return { input, output, total, count };
}

export async function GET() {
  try {
    const names = getAgentNames();
    const usage: AgentUsage[] = [];

    if (!existsSync(AGENTS_DIR)) return NextResponse.json([]);

    for (const agentId of readdirSync(AGENTS_DIR)) {
      const sessionsFile = join(AGENTS_DIR, agentId, 'sessions', 'sessions.json');
      if (!existsSync(sessionsFile)) continue;

      const { input, output, total, count } = extractUsage(sessionsFile);
      
      usage.push({
        agentId,
        agentName: names[agentId] || agentId,
        inputTokens: input,
        outputTokens: output,
        totalTokens: total,
        sessionCount: count,
      });
    }

    usage.sort((a, b) => b.totalTokens - a.totalTokens);
    return NextResponse.json(usage);
  } catch (error) {
    console.error('[tokens] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch token usage' }, { status: 500 });
  }
}
