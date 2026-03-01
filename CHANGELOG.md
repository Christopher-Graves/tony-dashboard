# Tony Dashboard Changelog

## 2026-02-20 - Performance Overhaul & New Features

### 🚀 Performance Improvements

#### Gateway API (`/api/gateway`)
- **Added in-memory caching** with 30-second TTL
- Cached responses return instantly (< 50ms vs 8-10s)
- Background refresh triggers at half-way point to keep data fresh
- Cache invalidates automatically on gateway restart
- Added `X-Cache-Hit` header to indicate cached responses

#### Agents API (`/api/agents`)
- **Added in-memory caching** with 15-second TTL
- **Async file reads** - no more blocking I/O
- **Smart mtime checking** - only re-reads files that changed
- Reuses cached data for unchanged agent files
- Falls back to stale cache on errors for resilience
- Performance: ~10x faster on cache hit (< 100ms vs 1-2s)

### ✨ New Features

#### Memory Browser (`/memory`)
- Browse all agent memory files from `workspace-*/memory/` directories
- Beautiful markdown rendering with `react-markdown`
- Real-time search filtering across all memories
- Agent filter to view specific agent's memories
- Split-pane interface: file list + content viewer
- Shows file metadata: agent, date, size

#### Calendar View (`/calendar`)
- Visual weekly calendar for cron jobs
- Shows next run time for each job
- Status indicators (success/error/unknown)
- Week navigation (previous/next/today)
- All jobs list below calendar
- Color-coded active day highlighting

#### Team Overview (`/team`)
- Beautiful card layout for all 12 agents
- Reads agent identity from `IDENTITY.md` files
- Shows emoji, role, description for each agent
- Real-time status (active/idle/error)
- Last activity timestamp with human-readable format
- Token usage statistics
- Current task display (from tasks API)
- Status color coding (green/yellow/red)

#### Identity API (`/api/identity`)
- New endpoint to fetch agent identity information
- Parses `IDENTITY.md` files automatically
- Extracts emoji, role, and description
- Graceful fallback for missing files

### 🧪 Testing

#### New Test Suite
- Added Node's built-in test runner (no Jest dependency)
- Created comprehensive test files:
  - `api-gateway.test.ts` - Cache behavior, response format
  - `api-agents.test.ts` - Cache, async reads, mtime checking
  - `api-memory.test.ts` - File discovery, search, filtering
  - `api-tasks.test.ts` - CRUD operations, filtering
- Run tests: `npm test`
- Watch mode: `npm run test:watch`

### 🎨 UI Updates

#### Updated Sidebar
- Added **Memory** (Brain icon)
- Added **Calendar** (CalendarDays icon)
- Added **Team** (Users icon)
- Reordered for better workflow

### 📋 API Summary

| Route | Method | Caching | Description |
|-------|--------|---------|-------------|
| `/api/gateway` | GET | 30s TTL | Gateway status with background refresh |
| `/api/agents` | GET | 15s TTL | Agent list with mtime-based smart reloading |
| `/api/memory` | GET | None | Memory files with search/filter |
| `/api/identity` | GET | None | Agent identity from IDENTITY.md |
| `/api/tasks` | GET/POST/PUT/DELETE | None | Task CRUD operations |
| `/api/crons` | GET | None | Cron job listing |

### 🔧 Technical Details

- **Cache Strategy**: TTL-based, not event-based
- **File Operations**: All async (`fs/promises`)
- **Path Handling**: Windows-compatible (`path.join()` everywhere)
- **Error Handling**: Graceful degradation with fallbacks
- **TypeScript**: Fully typed throughout
- **No New Dependencies**: Uses existing packages only

### 📊 Performance Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Gateway API (cold) | 8-10s | 8-10s | - |
| Gateway API (warm) | 8-10s | < 50ms | **160x faster** |
| Agents API (cold) | 1-2s | 1-2s | - |
| Agents API (warm) | 1-2s | < 100ms | **10-20x faster** |

### 🎯 Next Steps

Potential future enhancements:
- WebSocket support for real-time updates
- Memory file editing interface
- Cron job creation/editing UI
- Task board with drag-and-drop
- Agent performance analytics
- Token usage charts and trends
