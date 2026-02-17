# Tony Dashboard

A professional monitoring and management dashboard for Chris's OpenClaw multi-agent system. Monitor 12 AI agents, cron jobs, token usage, errors, and more from a beautiful dark-themed web interface.

![Tony Dashboard](https://img.shields.io/badge/Next.js-14+-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue?style=flat-square&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=flat-square&logo=tailwind-css)

## Features

### 🤖 Agent Status
- Real-time monitoring of all 12 AI agents
- Status indicators (active/idle/error)
- Last activity timestamps
- Session token counts
- Auto-refresh every 30 seconds

### ⏰ Cron Jobs
- View all scheduled tasks
- Manually trigger jobs
- Schedule and status information
- Last run and next run times

### 🔔 Reminders
- Active reminder list
- Schedule tracking
- Filtered from cron jobs

### 📋 Tasks (Kanban)
- Backlog → In Progress → Done columns
- Task priority levels
- Agent assignment tracking
- JSON-based storage

### 💰 Token Usage
- Per-agent token consumption
- Session-level breakdown
- Visual bar charts
- Total usage tracking

### ⚠️ Errors & Issues
- Real-time log parsing
- WARN and ERROR level filtering
- Gateway log monitoring
- Auto-refresh every 30 seconds

### 🗄️ Database Explorer
- PostgreSQL table browser
- Schema viewing
- Data inspection (read-only)
- Up to 50 rows per table

## Tech Stack

- **Next.js 14+** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** components
- **Recharts** for data visualization
- **PostgreSQL** via `pg` driver
- **date-fns** for date formatting

## Installation

### Prerequisites

- Node.js 22+
- OpenClaw Gateway running on `localhost:18789`
- PostgreSQL database (optional, for database explorer)

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` and add your OpenClaw gateway token:
   ```env
   GATEWAY_TOKEN=your_token_from_openclaw_json
   ```

   The token is located at `C:\Users\chris\.openclaw\openclaw.json` under `gateway.auth.token`.

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Production Build

```bash
npm run build
npm start
```

The dashboard will be available at `http://localhost:3000`.

## Project Structure

```
tony-dashboard/
├── app/
│   ├── api/              # API routes
│   │   ├── agents/       # Agent status endpoint
│   │   ├── crons/        # Cron jobs endpoints
│   │   ├── tokens/       # Token usage endpoint
│   │   ├── errors/       # Error log parser
│   │   ├── db/           # Database API
│   │   └── tasks/        # Task CRUD API
│   ├── crons/            # Cron jobs page
│   ├── reminders/        # Reminders page
│   ├── tasks/            # Kanban board
│   ├── tokens/           # Token usage charts
│   ├── errors/           # Error log viewer
│   ├── database/         # Database explorer
│   ├── layout.tsx        # Root layout with sidebar
│   ├── page.tsx          # Agent status (home)
│   └── globals.css       # Global styles
├── components/
│   ├── ui/               # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── badge.tsx
│   └── Sidebar.tsx       # Navigation sidebar
├── lib/
│   ├── utils.ts          # Utility functions
│   ├── gateway.ts        # Gateway API client
│   └── db.ts             # PostgreSQL client
└── public/               # Static assets
```

## Data Sources

### 1. OpenClaw Gateway API
- **URL:** `http://localhost:18789`
- **Auth:** Bearer token from `openclaw.json`
- **Endpoints:**
  - `/api/sessions` - Agent sessions
  - `/api/crons` - Cron jobs list
  - `/api/crons/:id/trigger` - Trigger a cron job

### 2. PostgreSQL Database
- **Host:** localhost:5432
- **User:** tony
- **Database:** tony
- Accessed via `/api/db/tables` and `/api/db/query`

### 3. Log Files
- **Path:** `C:\tmp\openclaw\openclaw-*.log`
- Parsed by `/api/errors` for WARN/ERROR entries

### 4. Session Files
- **Path:** `C:\Users\chris\.openclaw\sessions`
- Read by `/api/tokens` for usage stats

## Configuration

All configuration is read from:
- `C:\Users\chris\.openclaw\openclaw.json` - OpenClaw config
- `.env.local` - Environment variables

## Features in Detail

### Auto-Refresh
Most panels refresh automatically every 30 seconds to show real-time data:
- Agent Status
- Cron Jobs
- Token Usage
- Errors & Issues

### Dark Theme
Professional dark theme optimized for long sessions:
- High contrast for readability
- Consistent color palette
- Subtle borders and shadows

### Responsive Design
Desktop-first but responsive:
- Grid layouts adapt to screen size
- Optimized for 1920x1080+ displays
- Works on tablets and smaller screens

## Development

### Adding a New Panel

1. Create a new route in `app/your-panel/page.tsx`
2. Add API route if needed in `app/api/your-endpoint/route.ts`
3. Add navigation item to `components/Sidebar.tsx`
4. Choose an icon from `lucide-react`

### Database Schema
To add new tables or queries, extend the `lib/db.ts` module and create corresponding API routes.

## Troubleshooting

### Gateway Connection Issues
- Ensure OpenClaw Gateway is running: `openclaw gateway status`
- Check the token in `.env.local` matches `openclaw.json`
- Verify gateway is on port 18789

### Database Connection Errors
- Check PostgreSQL is running
- Verify credentials in `.env.local`
- Ensure user `tony` has access to database `tony`

### Log Parsing Errors
- Check log directory exists: `C:\tmp\openclaw`
- Ensure read permissions on log files

## License

Private project for Christopher Graves.

## Credits

Built with love for Chris's AI agent ecosystem.

**Dashboard panels:**
- 🤖 Agent Status
- ⏰ Cron Jobs
- 🔔 Reminders
- 📋 Tasks
- 💰 Token Usage
- ⚠️ Errors
- 🗄️ Database

---

**Built by Tony** | OpenClaw Multi-Agent System
