import { NextResponse } from 'next/server';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const LOG_DIR = 'C:\\tmp\\openclaw';

interface LogEntry {
  timestamp: string;
  level: string;
  subsystem: string;
  message: string;
  file?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    
    const errors: LogEntry[] = [];

    try {
      const files = readdirSync(LOG_DIR)
        .filter(f => f.startsWith('openclaw-') && f.endsWith('.log'))
        .sort()
        .reverse()
        .slice(0, 3); // Only check last 3 log files

      for (const file of files) {
        const logPath = join(LOG_DIR, file);
        try {
          const content = readFileSync(logPath, 'utf-8');
          const lines = content.split('\n');

          for (const line of lines) {
            if (!line.trim()) continue;

            // Simple log parsing - adjust based on actual log format
            const warnMatch = line.match(/\[(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[^\]]*)\].*?(WARN|ERROR|FATAL)/i);
            
            if (warnMatch) {
              const [, timestamp, level] = warnMatch;
              
              errors.push({
                timestamp,
                level: level.toUpperCase(),
                subsystem: 'gateway',
                message: line.substring(warnMatch.index! + warnMatch[0].length).trim(),
                file,
              });

              if (errors.length >= limit) break;
            }
          }

          if (errors.length >= limit) break;
        } catch (err) {
          console.warn(`Error reading log file ${file}:`, err);
        }
      }
    } catch (err) {
      console.warn('Error reading log directory:', err);
    }

    return NextResponse.json(errors);
  } catch (error) {
    console.error('Error fetching errors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch errors' },
      { status: 500 }
    );
  }
}
