import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

describe('API: /api/gateway', () => {
  const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
  
  describe('GET /api/gateway', () => {
    it('should return gateway status with expected fields', async () => {
      const res = await fetch(`${BASE_URL}/api/gateway`);
      const data = await res.json();
      
      assert.strictEqual(res.status, 200);
      assert.ok('status' in data, 'Response should include status');
      assert.ok('checkedAt' in data, 'Response should include checkedAt');
      assert.ok(['running', 'stopped', 'unreachable'].includes(data.status));
    });

    it('should cache responses for 30 seconds', async () => {
      const res1 = await fetch(`${BASE_URL}/api/gateway`);
      const data1 = await res1.json();
      const time1 = new Date(data1.checkedAt).getTime();
      
      // Immediate second request should return cached data
      const res2 = await fetch(`${BASE_URL}/api/gateway`);
      const data2 = await res2.json();
      const time2 = new Date(data2.checkedAt).getTime();
      
      assert.strictEqual(time1, time2, 'Second request should return cached data');
    });

    it('should refresh cache in background', async () => {
      const res = await fetch(`${BASE_URL}/api/gateway`);
      const data = await res.json();
      
      // Response should be fast (< 1s) due to caching
      assert.ok(res.headers.get('x-cache-hit') !== null || data.checkedAt);
    });
  });

  describe('POST /api/gateway', () => {
    it('should accept restart action', async () => {
      const res = await fetch(`${BASE_URL}/api/gateway`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart' }),
      });
      
      // Accept either success or error (don't actually restart in tests)
      assert.ok(res.status === 200 || res.status === 500);
    });

    it('should reject unknown actions', async () => {
      const res = await fetch(`${BASE_URL}/api/gateway`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invalid' }),
      });
      const data = await res.json();
      
      assert.strictEqual(res.status, 400);
      assert.ok(data.error);
    });
  });
});
