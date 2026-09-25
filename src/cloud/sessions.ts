/**
 * sessions.ts — server-side sessions behind the `th_session` cookie.
 *
 * The cookie carries a random 256-bit token; only its SHA-256 is stored, so
 * a leaked database cannot be replayed as cookies.
 */

import crypto from 'node:crypto';
import type { IncomingMessage } from 'node:http';

import { SESSION_COOKIE, SESSION_TTL_MS } from './config.js';
import type { CloudDb, SessionRow, UserRow } from './db.js';

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of (header ?? '').split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    if (!name || name in cookies) continue;
    try {
      cookies[name] = decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      cookies[name] = part.slice(index + 1).trim();
    }
  }
  return cookies;
}

export function sessionCookie(token: string, secure: boolean, maxAgeMs = SESSION_TTL_MS): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

export const clearedSessionCookie = (secure: boolean): string => sessionCookie('', secure, 0);

export function createSession(
  db: CloudDb,
  userId: number,
  meta: { ip: string | null; userAgent: string | null },
): { token: string; row: SessionRow } {
  const token = crypto.randomBytes(32).toString('base64url');
  const created = Date.now();
  const row: SessionRow = {
    id_hash: hashToken(token),
    user_id: userId,
    created_at: new Date(created).toISOString(),
    expires_at: new Date(created + SESSION_TTL_MS).toISOString(),
    ip: meta.ip,
    user_agent: meta.userAgent?.slice(0, 512) ?? null,
  };
  db.insertSession(row);
  return { token, row };
}

export interface ResolvedSession {
  tokenHash: string;
  session: SessionRow;
  user: UserRow;
}

/** The active session + user for a request, or null. Expired rows are deleted. */
export function resolveSession(db: CloudDb, req: Pick<IncomingMessage, 'headers'>): ResolvedSession | null {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = db.sessionByHash(tokenHash);
  if (!session) return null;
  if (Date.parse(session.expires_at) <= Date.now()) {
    db.deleteSession(tokenHash);
    return null;
  }
  const user = db.userById(session.user_id);
  if (!user || user.status !== 'active') return null;
  return { tokenHash, session, user };
}
