import { NextResponse } from 'next/server';

// NOTE: The gateway has no REST API. Crons can only be triggered via WebSocket
// or via the OpenClaw CLI: `openclaw cron run <id>`
// This endpoint is intentionally disabled.
export async function POST() {
  return NextResponse.json(
    {
      error: 'Manual cron triggering via REST is not supported. Use the OpenClaw CLI: openclaw cron run <id>',
    },
    { status: 501 }
  );
}
