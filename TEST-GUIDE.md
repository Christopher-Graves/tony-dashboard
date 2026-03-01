# Testing Guide

## Running Tests

The dashboard uses Node's built-in test runner (no Jest required).

### Run all tests
```bash
npm test
```

### Run in watch mode
```bash
npm run test:watch
```

### Run specific test file
```bash
node --test __tests__/api-gateway.test.ts
```

## Test Coverage

### API Gateway Tests (`api-gateway.test.ts`)
- ✅ Returns expected status fields
- ✅ Caches responses for 30 seconds
- ✅ Refreshes cache in background
- ✅ Accepts restart action
- ✅ Rejects unknown actions

### API Agents Tests (`api-agents.test.ts`)
- ✅ Returns array of agents
- ✅ Includes required fields (id, name, status)
- ✅ Caches responses for 15 seconds
- ✅ Uses async file reads
- ✅ Checks mtime before re-reading files

### API Memory Tests (`api-memory.test.ts`)
- ✅ Returns array of memory files
- ✅ Includes required fields (path, agent, content, mtime)
- ✅ Filters by search query
- ✅ Filters by agent
- ✅ Combines search and agent filters
- ✅ Handles errors gracefully

### API Tasks Tests (`api-tasks.test.ts`)
- ✅ Returns array of tasks
- ✅ Includes required fields (id, title, status)
- ✅ Filters by status
- ✅ Filters by category
- ✅ Filters by priority
- ✅ Creates new tasks
- ✅ Validates required fields
- ✅ Updates task status
- ✅ Requires task ID for deletion

## Testing Against Live Server

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. In another terminal, run tests:
   ```bash
   npm test
   ```

The tests will run against `http://localhost:3000` by default.

## Environment Variables

You can override the test URL:
```bash
TEST_URL=http://localhost:4000 npm test
```

## Expected Test Output

All tests should pass. Output will look like:

```
▶ API: /api/gateway
  ▶ GET /api/gateway
    ✔ should return gateway status with expected fields
    ✔ should cache responses for 30 seconds
    ✔ should refresh cache in background
  ▶ POST /api/gateway
    ✔ should accept restart action
    ✔ should reject unknown actions

▶ API: /api/agents
  ...

✔ all tests passed
```

## Troubleshooting

### Tests fail: Connection refused
- Make sure the dev server is running (`npm run dev`)
- Check if port 3000 is available

### Cache tests fail intermittently
- Cache TTLs are time-based; tests may fail if run too slowly
- Re-run tests - they should pass on second attempt

### Memory tests find no files
- Normal if no agent memory files exist yet
- Tests handle this gracefully (empty array is valid)

## Manual Testing

### Gateway API
```bash
curl http://localhost:3000/api/gateway
# Second request should be cached (same checkedAt timestamp)
curl http://localhost:3000/api/gateway
```

### Agents API
```bash
curl http://localhost:3000/api/agents
```

### Memory API
```bash
# All memories
curl http://localhost:3000/api/memory

# Search
curl "http://localhost:3000/api/memory?q=dashboard"

# Filter by agent
curl "http://localhost:3000/api/memory?agent=engineering"
```

### Tasks API
```bash
# List tasks
curl http://localhost:3000/api/tasks

# Filter by status
curl "http://localhost:3000/api/tasks?status=backlog"

# Filter by category
curl "http://localhost:3000/api/tasks?category=engineering"
```

### Identity API
```bash
curl "http://localhost:3000/api/identity?agent=engineering"
```
