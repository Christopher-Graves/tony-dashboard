// OpenClaw Gateway API client
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:18789';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || '';

export interface Session {
  id: string;
  agentId: string;
  channel: string;
  status: 'active' | 'idle' | 'error';
  lastActivity: string;
  tokenCount?: number;
}

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  model: string;
  lastRun?: string;
  nextRun?: string;
  status: string;
  enabled: boolean;
}

class GatewayClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string = GATEWAY_URL, token: string = GATEWAY_TOKEN) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  private async fetch(path: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      throw new Error(`Gateway API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getSessions(): Promise<Session[]> {
    return this.fetch('/api/sessions');
  }

  async getCrons(): Promise<CronJob[]> {
    return this.fetch('/api/crons');
  }

  async triggerCron(id: string): Promise<void> {
    return this.fetch(`/api/crons/${id}/trigger`, { method: 'POST' });
  }

  async getStatus(): Promise<any> {
    return this.fetch('/api/status');
  }
}

export const gateway = new GatewayClient();
