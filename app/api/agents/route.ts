import { NextResponse } from 'next/server';
import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const OPENCLAW_CONFIG_PATH = join(homedir(), '.openclaw', 'openclaw.json');
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

// In-memory cache
let agentCache: { data: Agent[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 15_000;

// Per-file mtime cache to avoid re-reading unchanged files
const fileCache = new Map<string, { mtime: number; totalTokens: number; latestActivity: number; sessionId?: string }>();

function extractTokenData(sessionsFile: string): { totalTokens: number; latestActivity: number; sessionId?: string } {
  let totalTokens = 0;
  let latestActivity = 0;
  let sessionId: string | undefined;

  try {
    const stat = statSync(sessionsFile);
    const mtimeMs = stat.mtimeMs;

    // Check if file changed since last read
    const cached = fileCache.get(sessionsFile);
    if (cached && cached.mtime === mtimeMs) {
      return { totalTokens: cached.totalTokens, latestActivity: cached.latestActivity, sessionId: cached.sessionId };
    }

    const raw = readFileSync(sessionsFile, 'utf-8');

    // For large files, use regex to avoid full JSON parse
    if (stat.size > 500_000) {
      const tokenMatches = raw.matchAll(/"totalTokens"\s*:\s*(\d+)/g);
      for (const m of tokenMatches) {
        totalTokens += parseInt(m[1], 10);
      }
      const updateMatches = raw.matchAll(/"updatedAt"\s*:\s*(\d+)/g);
      for (const m of updateMatches) {
        const ts = parseInt(m[1], 10);
        if (ts > latestActivity) latestActivity = ts;
      }
      const sidMatch = raw.match(/"sessionId"\s*:\s*"([^"]+)"/);
      if (sidMatch) sessionId = sidMatch[1];
    } else {
      const sessions = JSON.parse(raw);
      for (const [, session] of Object.entries(sessions) as [string, any][]) {
        totalTokens += session.totalTokens || 0;
        if (session.updatedAt && session.updatedAt > latestActivity) {
          latestActivity = session.updatedAt;
          sessionId = session.sessionId;
        }
      }
    }

    // Cache result keyed by mtime
    fileCache.set(sessionsFile, { mtime: mtimeMs, totalTokens, latestActivity, sessionId });
  } catch (err) {
    console.warn(`[agents] Error reading ${sessionsFile}:`, err);
  }

  return { totalTokens, latestActivity, sessionId };
}

function buildAgentFromDir(agentId: string, configAgent?: any): Agent {
  const agentData: Agent = {
    id: agentId,
    name: configAgent?.name || agentId,
    workspace: configAgent?.workspace || join(homedir(), '.openclaw', 'workspace'),
    status: 'idle' as const,
    lastActivity: undefined,
    tokenCount: 0,
    sessionId: undefined,
  };

  const sessionsFile = join(AGENTS_DIR, agentId, 'sessions', 'sessions.json');
  if (existsSync(sessionsFile)) {
    const { totalTokens, latestActivity, sessionId } = extractTokenData(sessionsFile);
    agentData.tokenCount = totalTokens;
    if (latestActivity > 0) {
      agentData.lastActivity = new Date(latestActivity).toISOString();
      agentData.status = (Date.now() - latestActivity < 5 * 60 * 1000) ? 'active' : 'idle';
    }
    agentData.sessionId = sessionId;
  }

  return agentData;
}

function buildAgentList(): Agent[] {
  let configData = readFileSync(OPENCLAW_CONFIG_PATH, 'utf-8');
  // Strip BOM if present (fixes parsing openclaw.json)
  if (configData.charCodeAt(0) === 0xFEFF) {
    configData = configData.slice(1);
  }
  const config = JSON.parse(configData);

  // Build a map of config agents for quick lookup
  const configAgents = new Map<string, any>();
  if (config.agents?.list) {
    for (const agent of config.agents.list) {
      configAgents.set(agent.id, agent);
    }
  }

  // Discover all agents from the agents directory (includes ones not in config)
  const seenIds = new Set<string>();
  const agents: Agent[] = [];

  if (existsSync(AGENTS_DIR)) {
    const { readdirSync } = require('fs');
    const dirs = readdirSync(AGENTS_DIR, { withFileTypes: true });
    for (const dir of dirs) {
      if (dir.isDirectory() && dir.name !== 'main') {
        seenIds.add(dir.name);
        agents.push(buildAgentFromDir(dir.name, configAgents.get(dir.name)));
      }
    }
  }

  // Also add any config agents that don't have directories yet
  for (const [id, configAgent] of configAgents) {
    if (!seenIds.has(id)) {
      agents.push(buildAgentFromDir(id, configAgent));
    }
  }

  // Sort: tony first, then alphabetical
  agents.sort((a, b) => {
    if (a.id === 'tony') return -1;
    if (b.id === 'tony') return 1;
    return a.id.localeCompare(b.id);
  });

  return agents;
}

export async function GET() {
  try {
    // Return cached if fresh
    if (agentCache && (Date.now() - agentCache.timestamp) < CACHE_TTL_MS) {
      return NextResponse.json(agentCache.data);
    }

    const agents = buildAgentList();
    agentCache = { data: agents, timestamp: Date.now() };
    return NextResponse.json(agents);
  } catch (error) {
    console.error('[agents] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch agents', details: String(error) }, { status: 500 });
  }
}