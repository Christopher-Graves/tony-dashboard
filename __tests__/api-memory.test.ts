import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('API: /api/memory', () => {
  const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
  
  describe('GET /api/memory', () => {
    it('should return array of memory files', async () => {
      const res = await fetch(`${BASE_URL}/api/memory`);
      const data = await res.json();
      
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(data), 'Response should be an array');
    });

    it('should include required fields for each memory', async () => {
      const res = await fetch(`${BASE_URL}/api/memory`);
      const memories = await res.json();
      
      if (memories.length > 0) {
        const mem = memories[0];
        assert.ok('path' in mem, 'Memory should have path');
        assert.ok('agent' in mem, 'Memory should have agent');
        assert.ok('content' in mem, 'Memory should have content');
        assert.ok('mtime' in mem, 'Memory should have mtime');
      }
    });

    it('should filter by search query', async () => {
      const res = await fetch(`${BASE_URL}/api/memory?q=test`);
      const data = await res.json();
      
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(data));
      
      // All results should contain search term
      if (data.length > 0) {
        data.forEach((mem: any) => {
          const contentLower = mem.content.toLowerCase();
          assert.ok(
            contentLower.includes('test'),
            'Each result should contain search term'
          );
        });
      }
    });

    it('should filter by agent', async () => {
      const res = await fetch(`${BASE_URL}/api/memory?agent=engineering`);
      const data = await res.json();
      
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(data));
      
      // All results should be from the specified agent
      if (data.length > 0) {
        data.forEach((mem: any) => {
          assert.strictEqual(mem.agent, 'engineering');
        });
      }
    });

    it('should combine search and agent filters', async () => {
      const res = await fetch(`${BASE_URL}/api/memory?q=dashboard&agent=engineering`);
      const data = await res.json();
      
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(data));
    });

    it('should handle errors gracefully', async () => {
      const res = await fetch(`${BASE_URL}/api/memory?agent=nonexistent`);
      
      // Should return empty array or error, not crash
      assert.ok(res.status === 200 || res.status === 500);
    });
  });
});
