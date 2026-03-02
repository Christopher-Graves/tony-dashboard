import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const token = process.env.GATEWAY_TOKEN || '';
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'ws://localhost:18789';
  
  return NextResponse.json({
    token,
    gatewayUrl,
  });
}
