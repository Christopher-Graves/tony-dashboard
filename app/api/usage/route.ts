import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';

const USAGE_DATA = join(homedir(), '.openclaw', 'workspace', 'usage-data.json');
const SCRAPER = join(homedir(), '.openclaw', 'bin', 'usage-scraper.js');
const STALE_MS = 5 * 60 * 1000; // 5 minutes

// Anthropic pricing (per million tokens) for token-based estimates
const PRICING: Record<string, { input: number; output: number; cacheRead?: number }> = {
  'claude-opus-4-6': { input: 15.0, output: 75.0, cacheRead: 1.5 },
  'claude-sonnet-4-5': { input: 3.0, output: 15.0, cacheRead: 0.3 },
  'claude-haiku-4-5': { input: 0.80, output: 4.0, cacheRead: 0.08 },
  'default': { input: 3.0, output: 15.0, cacheRead: 0.3 },
};

function getPrice(model: string) {
  for (const [key, price] of Object.entries(PRICING)) {
    if (model.includes(key)) return price;
  }
  return PRICING['default'];
}

function getAgentNames(): Record<string, string> {
  try {
    const config = JSON.parse(readFileSync(join(homedir(), '.openclaw', 'openclaw.json'), 'utf-8'));
    const map: Record<string, string> = {};
    for (const agent of config.agents?.list || []) {
      map[agent.id] = agent.name || agent.id;
    }
    return map;
  } catch {
    return {};
  }
}

function calculateTokenUsage() {
  const AGENTS_DIR = join(homedir(), '.openclaw', 'agents');
  const agentNames = getAgentNames();
  const byModel: Record<string, any> = {};
  const byAgent: Record<string, any> = {};
  const topSessions: any[] = [];
  let totalInput = 0, totalOutput = 0, totalTokens = 0, totalCost = 0;

  const { readdirSync } = require('fs');
  for (const agentId of readdirSync(AGENTS_DIR)) {
    const sessionsFile = join(AGENTS_DIR, agentId, 'sessions', 'sessions.json');
    if (!existsSync(sessionsFile)) continue;
    try {
      const sessions = JSON.parse(readFileSync(sessionsFile, 'utf-8'));
      for (const [key, session] of Object.entries(sessions) as [string, any][]) {
        const model = session.model || 'unknown';
        const input = session.inputTokens || 0;
        const output = session.outputTokens || 0;
        const total = session.totalTokens || (input + output);
        const price = getPrice(model);
        const cost = (input * price.input + output * price.output) / 1_000_000;
        totalInput += input; totalOutput += output; totalTokens += total; totalCost += cost;
        if (!byModel[model]) byModel[model] = { inputTokens: 0, outputTokens: 0, totalTokens: 0, sessions: 0, estimatedCost: 0 };
        byModel[model].inputTokens += input; byModel[model].outputTokens += output;
        byModel[model].totalTokens += total; byModel[model].sessions += 1; byModel[model].estimatedCost += cost;
        if (!byAgent[agentId]) byAgent[agentId] = { inputTokens: 0, outputTokens: 0, totalTokens: 0, sessions: 0, estimatedCost: 0, model: '' };
        byAgent[agentId].inputTokens += input; byAgent[agentId].outputTokens += output;
        byAgent[agentId].totalTokens += total; byAgent[agentId].sessions += 1; byAgent[agentId].estimatedCost += cost;
        byAgent[agentId].model = model;
        topSessions.push({ key, agent: agentNames[agentId] || agentId, tokens: total, model, cost });
      }
    } catch { /* skip */ }
  }
  topSessions.sort((a, b) => b.tokens - a.tokens);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysElapsed = now.getDate();
  const daysRemaining = endOfMonth.getDate() - daysElapsed;
  const dailyAvg = daysElapsed > 0 ? totalCost / daysElapsed : 0;

  return {
    calculatedAt: now.toISOString(),
    billingPeriod: { start: startOfMonth.toISOString().split('T')[0], end: endOfMonth.toISOString().split('T')[0], daysRemaining, daysElapsed },
    totalUsage: { inputTokens: totalInput, outputTokens: totalOutput, totalTokens, estimatedCost: totalCost },
    projectedMonthly: { estimatedCost: dailyAvg * endOfMonth.getDate(), dailyAvg },
    byModel,
    byAgent,
    topSessions: topSessions.slice(0, 20),
  };
}

function getMaxPlanUsage() {
  try {
    if (!existsSync(USAGE_DATA)) return null;
    const data = JSON.parse(readFileSync(USAGE_DATA, 'utf-8'));
    const age = Date.now() - new Date(data.scraped_at).getTime();
    return { ...data, stale: age > STALE_MS, ageMs: age };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';

  try {
    if (type === 'plan' || type === 'all') {
      const plan = getMaxPlanUsage();
      const tokens = type === 'all' ? calculateTokenUsage() : undefined;
      return NextResponse.json({ plan, tokens });
    }
    if (type === 'tokens') {
      return NextResponse.json(calculateTokenUsage());
    }
    return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
  } catch (error: any) {
    console.error('[usage] Error:', error);
    return NextResponse.json({ error: 'Failed to calculate usage' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.action === 'refresh') {
      // Run the scraper to get fresh data
      try {
        execSync(`node "${SCRAPER}" --json`, { timeout: 60000 });
        const plan = getMaxPlanUsage();
        return NextResponse.json({ success: true, plan });
      } catch (e: any) {
        return NextResponse.json({ error: 'Scraper failed: ' + e.message }, { status: 500 });
      }
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
