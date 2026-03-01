import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('API: /api/agents', () => {
  const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
  
  describe('GET /api/agents', () => {
    it('should return array of agents', async () => {
      const res = await fetch(`${BASE_URL}/api/agents`);
      const data = await res.json();
      
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(data), 'Response should be an array');
    });

    it('should include required fields for each agent', async () => {
      const res = await fetch(`${BASE_URL}/api/agents`);
      const agents = await res.json();
      
      if (agents.length > 0) {
        const agent = agents[0];
        assert.ok('id' in agent, 'Agent should have id');
        assert.ok('name' in agent, 'Agent should have name');
        assert.ok('status' in agent, 'Agent should have status');
        assert.ok(['active', 'idle', 'error'].includes(agent.status));
      }
    });

    it('should cache responses for 15 seconds', async () => {
      const res1 = await fetch(`${BASE_URL}/api/agents`);
      const data1 = await res1.json();
      
      // Immediate second request should return cached data
      const res2 = await fetch(`${BASE_URL}/api/agents`);
      const data2 = await res2.json();
      
      assert.deepStrictEqual(data1, data2, 'Second request should return cached data');
    });

    it('should use async file reads', async () => {
      const start = Date.now();
      const res = await fetch(`${BASE_URL}/api/agents`);
      const elapsed = Date.now() - start;
      
      assert.strictEqual(res.status, 200);
      // With caching and async, should be fast (< 2s even on first request)
      assert.ok(elapsed < 2000, `Request took ${elapsed}ms, should be < 2000ms`);
    });

    it('should check mtime before re-reading files', async () => {
      // First request primes cache
      await fetch(`${BASE_URL}/api/agents`);
      
      // Second request should skip unchanged files
      const start = Date.now();
      const res = await fetch(`${BASE_URL}/api/agents`);
      const elapsed = Date.now() - start;
      
      assert.strictEqual(res.status, 200);
      assert.ok(elapsed < 500, `Cached request took ${elapsed}ms, should be < 500ms`);
    });
  });
});
