import { NextResponse } from 'next/server';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

const buckets = new Map<string, { tokens: number; lastRefill: number }>();

// Clean up inactive buckets to prevent memory leak
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    // If no request for 1 hour, delete
    if (now - bucket.lastRefill > 3600000) {
      buckets.delete(key);
    }
  }
}, 300000);

// Prevent Node.js process hanging in tests
if (typeof cleanupInterval.unref === 'function') {
  cleanupInterval.unref();
}

/**
 * Normalizes a URL for Upstash Redis. If the URL does not start with http/https,
 * it prepends https://.
 */
function normalizeRedisUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

export async function rateLimit(
  request: Request,
  routeIdentifier: string,
  limit: number,
  durationMs: number
): Promise<RateLimitResult> {
  const ip = getClientIp(request);
  const key = `ratelimit:${routeIdentifier}:${ip}`;

  const rawRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (rawRedisUrl && redisToken) {
    try {
      const redisUrl = normalizeRedisUrl(rawRedisUrl);
      const windowSizeMs = durationMs;
      const currentWindow = Math.floor(Date.now() / windowSizeMs);
      const windowKey = `${key}:${currentWindow}`;

      // Call Upstash pipeline API to increment and set expire
      const response = await fetch(`${redisUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', windowKey],
          ['EXPIRE', windowKey, Math.ceil(durationMs / 1000) * 2],
        ]),
      });

      if (response.ok) {
        const data = await response.json();
        // Pipeline returns array of responses, data[0] is for INCR
        const incrResult = data[0];
        if (incrResult && typeof incrResult.result === 'number') {
          const count = incrResult.result;
          const resetMs = (currentWindow + 1) * windowSizeMs - Date.now();
          const remaining = Math.max(0, limit - count);
          return {
            success: count <= limit,
            limit,
            remaining,
            resetMs,
          };
        }
      }
      console.warn('Upstash response invalid, falling back to in-memory rate limiting.');
    } catch (err) {
      console.error('Error contacting Upstash Redis REST API, falling back to in-memory rate limiting:', err);
    }
  }

  // Fallback to in-memory Token Bucket
  const now = Date.now();
  const bucket = buckets.get(key) || { tokens: limit, lastRefill: now };

  const timePassed = now - bucket.lastRefill;
  const refillRate = limit / durationMs; // tokens per ms
  const tokensToAdd = timePassed * refillRate;
  const currentTokens = Math.min(limit, bucket.tokens + tokensToAdd);

  if (currentTokens >= 1) {
    const updatedTokens = currentTokens - 1;
    buckets.set(key, { tokens: updatedTokens, lastRefill: now });
    return {
      success: true,
      limit,
      remaining: Math.floor(updatedTokens),
      resetMs: Math.ceil((limit - updatedTokens) / refillRate),
    };
  } else {
    buckets.set(key, { tokens: currentTokens, lastRefill: now });
    return {
      success: false,
      limit,
      remaining: 0,
      resetMs: Math.ceil((1 - currentTokens) / refillRate),
    };
  }
}

export function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',');
    return ips[0].trim();
  }
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp.trim();
  }
  return '127.0.0.1';
}
