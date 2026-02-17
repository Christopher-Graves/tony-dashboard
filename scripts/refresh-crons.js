#!/usr/bin/env node
// Refresh cron cache by calling OpenClaw gateway internal API
// Usage: node scripts/refresh-crons.js
// Or via the dashboard: POST /api/crons/refresh

const fs = require('fs');
const path = require('path');
const http = require('http');

const CONFIG_PATH = 'C:\\Users\\chris\\.openclaw\\openclaw.json';
const CACHE_PATH = path.join(__dirname, '..', '.cron-cache.json');

async function main() {
  // For now, this is a manual refresh tool.
  // The canonical way to get cron data is through the OpenClaw tool interface.
  // This script should be called after dumping cron data.
  console.log('Cron cache path:', CACHE_PATH);
  
  if (fs.existsSync(CACHE_PATH)) {
    const data = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    const count = (data.jobs || data).length;
    const age = data.updatedAt ? Math.round((Date.now() - data.updatedAt) / 60000) : '?';
    console.log(`Cache has ${count} jobs, ${age} minutes old`);
  } else {
    console.log('No cache found. Paste cron JSON into .cron-cache.json');
  }
}

main().catch(console.error);
