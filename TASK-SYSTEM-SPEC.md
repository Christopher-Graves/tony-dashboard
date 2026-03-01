# Task System Spec

## Overview
Shared task queue that all OpenClaw agents can read/write. Dashboard provides visibility.

## Storage
- **File**: `C:\Users\chris\.openclaw\shared\tasks.json`
- Shared location so all agent workspaces can access it
- Simple JSON array of task objects

## Task Schema
```json
{
  "id": "task-{timestamp}-{random}",
  "title": "Short description",
  "description": "Optional longer details",
  "category": "engineering",        // agent ID who should pick it up
  "status": "backlog",              // backlog | in-progress | done | cancelled
  "priority": "medium",             // low | medium | high | critical
  "source": "manual",              // manual | agent | cron | monitor
  "createdBy": "chris",            // who/what created it
  "assignedTo": "engineering",     // agent that picked it up
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "completedAt": "ISO-8601 | null",
  "notes": [],                     // array of { timestamp, author, text }
  "tags": [],                      // free-form tags
  "linkedCron": "cron-id | null",  // if created from a cron failure
  "linkedSession": "session-key"   // if created during a session
}
```

## How Agents Use It
1. Agent wakes up (heartbeat or cron)
2. Reads tasks.json, filters for `category` matching their ID + `status: "backlog"`
3. Picks highest priority task, sets `status: "in-progress"`
4. Does the work
5. Sets `status: "done"`, adds completion note
6. If blocked, adds a note and leaves in-progress

## Auto-Filing Sources
- **Cron Self-Healer**: Files tasks for failed crons → category: "engineering"
- **Brain Health Monitor**: Files tasks if brains are down → category: "engineering"  
- **Any agent**: Can file tasks for other agents when they hit something outside their scope
- **Manual**: Chris adds via dashboard

## Dashboard Features
- Kanban board view (columns: backlog, in-progress, done)
- Filter by category/agent
- Create new tasks with category picker
- Click to expand details/notes
- Priority color coding
