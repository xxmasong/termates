/**
 * firebase-token.ts — verify Firebase ID tokens without firebase-admin.
 *
 * Firebase ID tokens are RS256 JWTs signed by keys published as x509
 * certificates at SECURETOKEN_CERTS_URL. We cache that set for as long as
 * its Cache-Control max-age says, then check the claims Firebase documents:
 * aud = project id, iss = https://securetoken.google.com/<project id>,
 * exp in the future, iat / auth_time not in the future, sub non-empty.
 */

import crypto from 'node:crypto';

export const SECURETOKEN_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

/** Tolerated clock drift between us and Google, in seconds. */
const CLOCK_SKEW_S = 60;
const DEFAULT_MAX_AGE_S = 3600;

export interface FirebaseClaims {
  sub: string;
  aud: string;
  iss: string;
  exp: number;
  iat: number;
  auth_time: number;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  firebase?: { sign_in_provider?: string; identities?: Record<string, unknown> };
}

export class TokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenError';
  }
}

export interface KeySet {
  /** kid → PEM certificate */
  keys: Record<string, string>;
  /** epoch ms */
  expiresAt: number;
}

export type KeyFetcher = () => Promise<KeySet>;

/** Fetch Google's signing certs, honouring Cache-Control max-age. */
export const fetchGoogleKeys: KeyFetcher = async () => {
  const response = await fetch(SECURETOKEN_CERTS_URL);
  if (!response.ok) throw new TokenError(`Could not fetch signing keys (HTTP ${response.status}).`);
  const keys = (await response.json()) as Record<string, string>;
  const maxAge = /max-age=(\d+)/.exec(response.headers.get('cache-control') ?? '');
  const seconds = maxAge ? Number(maxAge[1]) : DEFAULT_MAX_AGE_S;
  return { keys, expiresAt: Date.now() + seconds * 1000 };
};

/** Caches one key set until it expires; refetches once on an unknown kid. */
export class KeyStore {
  private current: KeySet | null = null;
  private pending: Promise<KeySet> | null = null;

  constructor(
    private readonly fetcher: KeyFetcher = fetchGoogleKeys,
    private readonly clock: () => number = Date.now,
  ) {}

  private async refresh(): Promise<KeySet> {
    this.pending ??= this.fetcher().finally(() => {
      this.pending = null;
    });
    this.current = await this.pending;
    return this.current;
  }

  async get(kid: string): Promise<string | undefined> {
    let set = this.current;
    if (!set || set.expiresAt <= this.clock()) set = await this.refresh();
    if (!set.keys[kid]) set = await this.refresh();
    return set.keys[kid];
  }
}

const decodeSegment = (segment: string): unknown => {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf-8'));
  } catch {
    throw new TokenError('Malformed token.');
  }
};

export interface VerifyOptions {
  projectId: string;
  keys: KeyStore;
  /** epoch ms, injectable for tests */
  now?: number;
}

export async function verifyIdToken(token: string, options: VerifyOptions): Promise<FirebaseClaims> {
  if (typeof token !== 'string' || !token) throw new TokenError('Missing token.');
  const parts = token.split('.');
  if (parts.length !== 3) throw new TokenError('Malformed token.');
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = decodeSegment(headerB64) as { alg?: unknown; kid?: unknown };
  if (header.alg !== 'RS256') throw new TokenError('Unexpected signing algorithm.');
  if (typeof header.kid !== 'string' || !header.kid) throw new TokenError('Missing key id.');

  const pem = await options.keys.get(header.kid);
  if (!pem) throw new TokenError('Unknown signing key.');

  const valid = crypto.verify(
    'RSA-SHA256',
    Buffer.from(`${headerB64}.${payloadB64}`),
    crypto.createPublicKey(pem),
    Buffer.from(signatureB64, 'base64url'),
  );
  if (!valid) throw new TokenError('Bad signature.');

  const claims = decodeSegment(payloadB64) as Partial<FirebaseClaims>;
  const nowS = Math.floor((options.now ?? Date.now()) / 1000);

  if (claims.aud !== options.projectId) throw new TokenError('Wrong audience.');
  if (claims.iss !== `https://securetoken.google.com/${options.projectId}`) {
    throw new TokenError('Wrong issuer.');
  }
  if (typeof claims.exp !== 'number' || claims.exp <= nowS - CLOCK_SKEW_S) {
    throw new TokenError('Token expired.');
  }
  if (typeof claims.iat !== 'number' || claims.iat > nowS + CLOCK_SKEW_S) {
    throw new TokenError('Token issued in the future.');
  }
  if (typeof claims.auth_time !== 'number' || claims.auth_time > nowS + CLOCK_SKEW_S) {
    throw new TokenError('Bad auth_time.');
  }
  if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128) {
    throw new TokenError('Bad subject.');
  }

  return claims as FirebaseClaims;
}
