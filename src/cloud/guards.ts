/**
 * guards.ts — request helpers shared by the auth routes and the proxy.
 */

import type { IncomingMessage } from 'node:http';

/**
 * The caller's IP. We only listen on loopback behind `tailscale serve`, the
 * one trusted hop: it appends the real client to X-Forwarded-For, so only the
 * LAST entry is trustworthy — earlier ones are whatever the client sent.
 */
export function clientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[forwarded.length - 1] : forwarded;
  const last = value?.split(',').pop()?.trim();
  return last || req.socket.remoteAddress || 'unknown';
}

/** CSRF: a state-changing request must come from one of our origins. */
export function isAllowedOrigin(req: IncomingMessage, allowed: readonly string[]): boolean {
  const origin = req.headers.origin;
  return typeof origin === 'string' && allowed.includes(origin);
}

/** Fixed-window counter per key. */
export class RateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly clock: () => number = Date.now,
  ) {}

  /** Count one hit; false when the key is over its limit. */
  take(key: string): boolean {
    const now = this.clock();
    if (this.hits.size > 10_000) {
      for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
    }
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= this.limit;
  }
}

/** True for a browser page navigation (vs. XHR/fetch). */
export function isNavigation(req: IncomingMessage): boolean {
  const mode = req.headers['sec-fetch-mode'];
  if (typeof mode === 'string') return mode === 'navigate';
  return req.method === 'GET' && (req.headers.accept ?? '').includes('text/html');
}
