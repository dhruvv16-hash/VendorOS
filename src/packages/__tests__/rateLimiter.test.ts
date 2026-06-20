import { describe, test, before, after } from 'node:test';
import assert from 'node:assert';
import { rateLimit, getClientIp } from '../../lib/rateLimiter.js';

describe('Rate Limiter Tests', () => {
  let originalFetch: any;

  before(() => {
    originalFetch = global.fetch;
  });

  after(() => {
    global.fetch = originalFetch;
  });

  test('getClientIp parses headers correctly', () => {
    const req1 = new Request('https://example.com/api', {
      headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' }
    });
    assert.strictEqual(getClientIp(req1), '203.0.113.195');

    const req2 = new Request('https://example.com/api', {
      headers: { 'x-real-ip': '198.51.100.1' }
    });
    assert.strictEqual(getClientIp(req2), '198.51.100.1');

    const req3 = new Request('https://example.com/api');
    assert.strictEqual(getClientIp(req3), '127.0.0.1');
  });

  test('In-memory Rate Limiting - limits and blocks', async () => {
    // Delete any existing keys to isolate test
    const req = new Request('https://example.com/api', {
      headers: { 'x-real-ip': '1.1.1.1' }
    });

    // Limit is 2 requests per 500ms
    const r1 = await rateLimit(req, 'test-route-1', 2, 500);
    assert.strictEqual(r1.success, true);
    assert.strictEqual(r1.remaining, 1);

    const r2 = await rateLimit(req, 'test-route-1', 2, 500);
    assert.strictEqual(r2.success, true);
    assert.strictEqual(r2.remaining, 0);

    const r3 = await rateLimit(req, 'test-route-1', 2, 500);
    assert.strictEqual(r3.success, false);
    assert.strictEqual(r3.remaining, 0);

    // Wait 300ms, should get ~1 token back
    await new Promise((resolve) => setTimeout(resolve, 300));
    const r4 = await rateLimit(req, 'test-route-1', 2, 500);
    assert.strictEqual(r4.success, true);
  });

  test('Upstash Redis fallback mechanism', async () => {
    // Set temp env vars to trigger Upstash flow
    process.env.UPSTASH_REDIS_REST_URL = 'http://upstash-mock.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';

    const req = new Request('https://example.com/api', {
      headers: { 'x-real-ip': '2.2.2.2' }
    });

    // Mock global.fetch to simulate Upstash responding that limit is exceeded
    global.fetch = (async (url: string, options?: any) => {
      if (url.includes('upstash-mock.io/pipeline')) {
        return {
          ok: true,
          json: async () => [
            { result: 5 } // 5th request, exceeds limit of 3
          ]
        };
      }
      return { ok: false };
    }) as any;

    const res = await rateLimit(req, 'test-route-upstash', 3, 60000);
    // Since mock says count is 5, and limit is 3, it should fail
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.remaining, 0);

    // Mock global.fetch throwing error to verify in-memory fallback
    global.fetch = (async () => {
      throw new Error('Redis down');
    }) as any;

    const resFallback = await rateLimit(req, 'test-route-fallback', 10, 60000);
    // Should fallback to in-memory and succeed
    assert.strictEqual(resFallback.success, true);
    assert.strictEqual(resFallback.remaining, 9);

    // Clean up env vars
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });
});
