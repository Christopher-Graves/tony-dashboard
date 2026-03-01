import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';

const execAsync = promisify(exec);
const OPENCLAW = join(homedir(), 'AppData', 'Roaming', 'npm', 'openclaw.cmd');
const AGENTS_DIR = join(homedir(), '.openclaw', 'agents');
const CONFIG_PATH = join(homedir(), '.openclaw', 'openclaw.json');

// Gateway auth token for REST API (from environment)
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN;

if (!GATEWAY_TOKEN) {
  console.error('[SECURITY] GATEWAY_TOKEN environment variable not set');
}

interface SessionData {
  key: string;
  sessionId: string;
  agentId: string;
  agentName: string;
  kind: string;
  channel: string;
  displayName: string;
  model: string;
  totalTokens: number;
  contextTokens: number;
  usagePercent: number;
  compactionCount: number;
  updatedAt: number;
  lastActivity: string;
  chatType: string;
  transcriptPath: string;
  messageCount?: number;
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

function getSessionFileLineCount(filePath: string): number {
  try {
    if (!existsSync(filePath)) return 0;
    const content = readFileSync(filePath, 'utf-8');
    // Count JSON lines (each line is a message)
    return content.split('\n').filter(l => l.trim().length > 0).length;
  } catch {
    return 0;
  }
}

export async function GET() {
  try {
    const agentNames = getAgentNames();
    const allSessions: SessionData[] = [];

    // Read sessions from each agent's sessions.json
    for (const agentId of readdirSync(AGENTS_DIR)) {
      const sessionsFile = join(AGENTS_DIR, agentId, 'sessions', 'sessions.json');
      if (!existsSync(sessionsFile)) continue;

      try {
        const raw = readFileSync(sessionsFile, 'utf-8');
        const sessions = JSON.parse(raw);

        for (const [key, session] of Object.entries(sessions) as [string, any][]) {
          const contextTokens = session.contextTokens || 200000;
          const totalTokens = session.totalTokens || 0;
          const usagePercent = contextTokens > 0 ? Math.round((totalTokens / contextTokens) * 100) : 0;

          // Derive kind from key
          let kind = 'other';
          let displayName = key;
          if (key.includes(':slack:channel:')) {
            kind = 'channel';
            displayName = session.origin?.label || key.split(':').pop() || key;
          } else if (key.includes(':slack:thread:')) {
            kind = 'thread';
            displayName = session.origin?.label || 'Thread';
          } else if (key.includes(':subagent:')) {
            kind = 'subagent';
            displayName = session.origin?.label || 'Sub-agent';
          } else if (key.includes(':cron:')) {
            kind = 'cron';
            displayName = session.origin?.label || 'Cron';
          } else if (key.endsWith(':main')) {
            kind = 'main';
            displayName = 'Main / Heartbeat';
          } else if (key.includes(':telegram:') || key.includes(':signal:') || key.includes(':whatsapp:')) {
            kind = 'dm';
            displayName = session.origin?.label || key;
          }

          allSessions.push({
            key,
            sessionId: session.sessionId || '',
            agentId,
            agentName: agentNames[agentId] || agentId,
            kind,
            channel: session.origin?.surface || session.origin?.provider || 'unknown',
            displayName,
            model: session.model || 'unknown',
            totalTokens,
            contextTokens,
            usagePercent,
            compactionCount: session.compactionCount || 0,
            updatedAt: session.updatedAt || 0,
            lastActivity: session.updatedAt ? new Date(session.updatedAt).toISOString() : '',
            chatType: session.chatType || 'unknown',
            transcriptPath: session.sessionFile || '',
          });
        }
      } catch (err) {
        console.warn(`[sessions] Error parsing ${sessionsFile}:`, err);
      }
    }

    // Sort by most recent activity
    allSessions.sort((a, b) => b.updatedAt - a.updatedAt);

    // Summary stats
    const summary = {
      total: allSessions.length,
      byKind: {} as Record<string, number>,
      byAgent: {} as Record<string, number>,
      totalTokens: allSessions.reduce((s, x) => s + x.totalTokens, 0),
      nearLimit: allSessions.filter(s => s.usagePercent > 75).length,
      overHalf: allSessions.filter(s => s.usagePercent > 50).length,
    };
    for (const s of allSessions) {
      summary.byKind[s.kind] = (summary.byKind[s.kind] || 0) + 1;
      summary.byAgent[s.agentId] = (summary.byAgent[s.agentId] || 0) + 1;
    }

    return NextResponse.json({ summary, sessions: allSessions });
  } catch (error) {
    console.error('[sessions] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, sessionKey, agentId } = body;

    if (!sessionKey || !agentId) {
      return NextResponse.json({ error: 'sessionKey and agentId required' }, { status: 400 });
    }

    if (action === 'compact') {
      // Trigger compaction by sending a system event to the agent via the Gateway.
      // This injects a memory-flush prompt into the main session and triggers a turn.
      // The Pi runtime auto-compacts when context usage is high enough.
      try {
        const { stdout, stderr } = await execAsync(
          `"${OPENCLAW}" system event --text "Pre-compaction memory flush. Store durable memories now (use memory/YYYY-MM-DD.md; create memory/ if needed). If nothing to store, reply with NO_REPLY." --mode now --token "${GATEWAY_TOKEN}" --timeout 60000`,
          { timeout: 90000 }
        );
        return NextResponse.json({ 
          success: true, 
          output: (stdout + stderr).trim() || 'System event sent. The agent will flush memory and auto-compact when context is high enough.' 
        });
      } catch (err: any) {
        return NextResponse.json({ 
          success: false, 
          error: err.message || 'Compaction trigger failed',
          output: (err.stdout || '') + (err.stderr || '')
        }, { status: 500 });
      }
    }

    if (action === 'delete') {
      // Delete session by removing from sessions.json and optionally the transcript
      const sessionsFile = join(AGENTS_DIR, agentId, 'sessions', 'sessions.json');
      if (!existsSync(sessionsFile)) {
        return NextResponse.json({ error: 'Sessions file not found' }, { status: 404 });
      }

      try {
        const raw = readFileSync(sessionsFile, 'utf-8');
        const sessions = JSON.parse(raw);
        
        if (!sessions[sessionKey]) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Get transcript path before deleting
        const transcriptPath = sessions[sessionKey].sessionFile;
        
        // Remove session
        delete sessions[sessionKey];
        
        // Write back
        const { writeFileSync, unlinkSync } = require('fs');
        writeFileSync(sessionsFile, JSON.stringify(sessions, null, 2));

        // Delete transcript file if it exists
        if (transcriptPath && existsSync(transcriptPath)) {
          try {
            unlinkSync(transcriptPath);
          } catch {
            // Non-critical
          }
        }

        return NextResponse.json({ success: true, message: `Deleted session ${sessionKey}` });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Unknown action. Use "compact" or "delete"' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Request failed' }, { status: 500 });
  }
}
