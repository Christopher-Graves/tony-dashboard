import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, sep, extname } from 'path';
import { homedir } from 'os';

const OPENCLAW_DIR = join(homedir(), '.openclaw');

// Remote agent workspaces mounted via SMB
const REMOTE_WORKSPACES: Record<string, { path: string; source: string }> = {
  'family-tony (pi)': { path: 'P:\\', source: 'Pi @ 192.168.5.28' },
  'claudia (mac mini)': { path: 'Q:\\', source: 'Mac Mini @ 192.168.5.16' },
};

// Map agent IDs to workspace dirs
function getWorkspaces(): Record<string, string> {
  const map: Record<string, string> = {};
  try {
    for (const entry of readdirSync(OPENCLAW_DIR)) {
      if (entry.startsWith('workspace')) {
        const full = join(OPENCLAW_DIR, entry);
        if (statSync(full).isDirectory()) {
          const agentId = entry === 'workspace' ? 'tony (main)' : entry.replace('workspace-', '');
          map[agentId] = full;
        }
      }
    }
  } catch { /* ignore */ }

  // Add remote workspaces if mounted
  for (const [id, info] of Object.entries(REMOTE_WORKSPACES)) {
    try {
      if (existsSync(info.path) && statSync(info.path).isDirectory()) {
        map[id] = info.path;
      }
    } catch { /* not mounted */ }
  }

  return map;
}

// Allowed extensions for viewing/editing
const TEXT_EXTS = new Set([
  '.md', '.txt', '.json', '.yaml', '.yml', '.toml', '.py', '.js', '.ts',
  '.sh', '.ps1', '.cmd', '.bat', '.csv', '.html', '.css', '.env', '.cfg',
  '.ini', '.log', '.xml', '.mdx', '.tsx', '.jsx', '.sql', '.conf', ''
]);

const EXCLUDED_DIRS = new Set([
  'node_modules', '.next', '.git', '__pycache__', '.venv', 'venv',
  'dist', 'build', '.turbo', '.cache', 'unsloth_compiled_cache'
]);

interface FileEntry {
  name: string;
  path: string;       // relative to workspace root
  type: 'file' | 'dir';
  size?: number;
  ext?: string;
  editable?: boolean;
  modifiedAt?: string;
  children?: FileEntry[];
}

function buildTree(dirPath: string, rootPath: string, depth = 0, maxDepth = 4): FileEntry[] {
  if (depth > maxDepth) return [];
  const entries: FileEntry[] = [];

  try {
    const items = readdirSync(dirPath).sort((a, b) => {
      // Dirs first, then files
      try {
        const aIsDir = statSync(join(dirPath, a)).isDirectory();
        const bIsDir = statSync(join(dirPath, b)).isDirectory();
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
      } catch { /* stat failed, just sort alphabetically */ }
      return a.localeCompare(b);
    });

    for (const item of items) {
      if (item.startsWith('.') && item !== '.env') continue;
      const fullPath = join(dirPath, item);
      const relPath = relative(rootPath, fullPath).split(sep).join('/');

      try {
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          if (EXCLUDED_DIRS.has(item)) continue;
          entries.push({
            name: item,
            path: relPath,
            type: 'dir',
            modifiedAt: stat.mtime.toISOString(),
            children: buildTree(fullPath, rootPath, depth + 1, maxDepth),
          });
        } else {
          const ext = extname(item).toLowerCase();
          entries.push({
            name: item,
            path: relPath,
            type: 'file',
            size: stat.size,
            ext,
            editable: TEXT_EXTS.has(ext) && stat.size < 512 * 1024, // Max 512KB for editing
            modifiedAt: stat.mtime.toISOString(),
          });
        }
      } catch { /* skip inaccessible */ }
    }
  } catch { /* ignore */ }

  return entries;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agent = searchParams.get('agent');
  const filePath = searchParams.get('path');

  // List all workspaces
  if (!agent) {
    const workspaces = getWorkspaces();
    const result = Object.entries(workspaces).map(([id, dir]) => {
      let fileCount = 0;
      try {
        // Quick count of top-level items
        fileCount = readdirSync(dir).filter(f => !f.startsWith('.') && !EXCLUDED_DIRS.has(f)).length;
      } catch { /* ignore */ }
      const remote = REMOTE_WORKSPACES[id];
      return { id, path: dir, fileCount, source: remote?.source || 'local' };
    });
    return NextResponse.json({ workspaces: result });
  }

  const workspaces = getWorkspaces();
  const wsRoot = workspaces[agent];
  if (!wsRoot || !existsSync(wsRoot)) {
    return NextResponse.json({ error: `Agent workspace not found: ${agent}` }, { status: 404 });
  }

  // Read a specific file
  if (filePath) {
    const fullPath = join(wsRoot, filePath);
    // Security: ensure path stays within workspace
    if (!fullPath.startsWith(wsRoot)) {
      return NextResponse.json({ error: 'Path traversal not allowed' }, { status: 403 });
    }
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      return NextResponse.json({ error: 'Cannot read directory as file' }, { status: 400 });
    }
    if (stat.size > 512 * 1024) {
      return NextResponse.json({ error: 'File too large (max 512KB)' }, { status: 413 });
    }
    const ext = extname(filePath).toLowerCase();
    if (!TEXT_EXTS.has(ext)) {
      return NextResponse.json({ error: 'Binary file — cannot display' }, { status: 415 });
    }

    try {
      const content = readFileSync(fullPath, 'utf-8');
      return NextResponse.json({
        path: filePath,
        content,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        editable: true,
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Return file tree for agent
  const tree = buildTree(wsRoot, wsRoot);
  return NextResponse.json({ agent, root: wsRoot, tree });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agent, path: filePath, content } = body;

    if (!agent || !filePath || content === undefined) {
      return NextResponse.json({ error: 'agent, path, and content required' }, { status: 400 });
    }

    const workspaces = getWorkspaces();
    const wsRoot = workspaces[agent];
    if (!wsRoot || !existsSync(wsRoot)) {
      return NextResponse.json({ error: `Agent workspace not found: ${agent}` }, { status: 404 });
    }

    const fullPath = join(wsRoot, filePath);
    // Security: ensure path stays within workspace
    if (!fullPath.startsWith(wsRoot)) {
      return NextResponse.json({ error: 'Path traversal not allowed' }, { status: 403 });
    }

    const ext = extname(filePath).toLowerCase();
    if (!TEXT_EXTS.has(ext)) {
      return NextResponse.json({ error: 'Cannot edit binary files' }, { status: 415 });
    }

    writeFileSync(fullPath, content, 'utf-8');
    const stat = statSync(fullPath);

    return NextResponse.json({
      success: true,
      path: filePath,
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
