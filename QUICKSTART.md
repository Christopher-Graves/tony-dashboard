# Tony Dashboard - Quick Start

Get the dashboard up and running in 5 minutes.

## Prerequisites

- ✅ Node.js 22+ installed
- ✅ OpenClaw Gateway running on localhost:18789
- ✅ Git (for cloning)

## Installation

```bash
# Clone the repository
git clone https://github.com/Christopher-Graves/tony-dashboard.git
cd tony-dashboard

# Install dependencies
npm install

# Set up environment
cp .env.local.example .env.local
```

## Configuration

Edit `.env.local` and add your OpenClaw gateway token:

```env
GATEWAY_TOKEN=your_token_here
```

**Where to find your token:**
- Open: `C:\Users\chris\.openclaw\openclaw.json`
- Find: `gateway.auth.token`
- Copy the value (48-character hex string)

## Run

### Development Mode
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Mode
```bash
npm run build
npm start
```

## Verify Setup

The dashboard should show:
- ✅ All 12 agents in the Agent Status panel
- ✅ Cron jobs list (if any configured)
- ✅ No connection errors

## Troubleshooting

### "Failed to fetch agents"
- ✅ Check OpenClaw Gateway is running: `openclaw gateway status`
- ✅ Verify `GATEWAY_TOKEN` in `.env.local` is correct
- ✅ Ensure gateway is on port 18789

### "Failed to fetch database tables"
- ⚠️ PostgreSQL may not be running
- ⚠️ Check credentials in `.env.local`
- ℹ️ Database explorer is optional - other panels will still work

### "No errors found"
- ✅ This is good! It means no recent errors in gateway logs
- ℹ️ Errors are parsed from `C:\tmp\openclaw\openclaw-*.log`

## Features Overview

| Panel | Description | Data Source |
|-------|-------------|-------------|
| 🤖 Agent Status | All 12 agents, status, tokens | Gateway API + Sessions |
| ⏰ Cron Jobs | Scheduled tasks, manual trigger | Gateway API |
| 🔔 Reminders | Active reminder jobs | Gateway API (filtered) |
| 📋 Tasks | Kanban board | Local JSON file |
| 💰 Token Usage | Per-agent consumption | Session files |
| ⚠️ Errors | Recent warnings/errors | Gateway logs |
| 🗄️ Database | PostgreSQL browser | Direct DB connection |

## Next Steps

1. **Auto-refresh**: Most panels refresh every 30 seconds automatically
2. **Dark theme**: Built-in, no configuration needed
3. **Responsive**: Works on tablets and smaller screens
4. **GitHub**: Code is at [Christopher-Graves/tony-dashboard](https://github.com/Christopher-Graves/tony-dashboard)

## Support

Built for Chris's OpenClaw multi-agent system.

For issues or questions, check the main [README.md](./README.md) or review the code in `app/` and `lib/`.

---

**Dashboard URL:** http://localhost:3000  
**GitHub Repo:** https://github.com/Christopher-Graves/tony-dashboard  
**Version:** 1.0.0
