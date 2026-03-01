import { NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export async function GET() {
  const home = homedir();
  const agentsDir = join(home, '.openclaw', 'agents');
  const tonySessionsFile = join(agentsDir, 'tony', 'sessions', 'sessions.json');
  
  const info: any = {
    cwd: process.cwd(),
    homedir: home,
    agentsDir,
    agentsDirExists: existsSync(agentsDir),
    tonySessionsFile,
    tonySessionsExists: existsSync(tonySessionsFile),
  };

  if (info.tonySessionsExists) {
    try {
      const data = readFileSync(tonySessionsFile, 'utf-8');
      const json = JSON.parse(data);
      const keys = Object.keys(json);
      let total = 0;
      for (const [k, v] of Object.entries(json) as [string, any][]) {
        total += v.totalTokens || 0;
      }
      info.tonyKeyCount = keys.length;
      info.tonyTotalTokens = total;
      info.firstKey = keys[0];
      info.firstKeyTokens = (json[keys[0]] as any)?.totalTokens;
    } catch (err) {
      info.parseError = String(err);
    }
  }

  return NextResponse.json(info);
}
