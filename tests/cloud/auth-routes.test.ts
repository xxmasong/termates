import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';

import express from 'express';

import { Accounts } from '../../src/cloud/accounts.js';
import { createAuthRouter } from '../../src/cloud/auth-routes.js';
import { loadConfig } from '../../src/cloud/config.js';
import { CloudDb } from '../../src/cloud/db.js';
import { KeyStore } from '../../src/cloud/firebase-token.js';
import type { Provisioner } from '../../src/cloud/provisioner.js';

const PROJECT = 'termhive-test';
const ORIGIN = 'https://th.example';
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = (claims: Record<string, unknown> = {}) => {
  const now = Math.floor(Date.now() / 1000);
  const body = `${b64({ alg: 'RS256', kid: 'k1' })}.${b64({
    iss: `https://securetoken.google.com/${PROJECT}`,
    aud: PROJECT,
    sub: 'uid-1',
    iat: now,
    exp: now + 3600,
    auth_time: now,
    email: 'someone@example.com',
    email_verified: true,
    firebase: { sign_in_provider: 'password' },
    ...claims,
  })}`;
  return `${body}.${crypto.sign('RSA-SHA256', Buffer.from(body), privateKey).toString('base64url')}`;
};

const start = async (env: Record<string, string>) => {
  const db = new CloudDb(':memory:');
  const config = loadConfig({ CLOUD_ORIGINS: ORIGIN, ...env });
  const provisioned: number[] = [];
  const provisioner = { provision: async (user: { id: number }) => void provisioned.push(user.id) };
  const app = express();
  app.use(
    '/auth',
    createAuthRouter({
      db,
      config,
      accounts: new Accounts(db, config),
      provisioner: provisioner as unknown as Provisioner,
      keys: new KeyStore(async () => ({ keys: { k1: publicPem }, expiresAt: Date.now() + 60_000 })),
    }),
  );
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { db, server, base, provisioned };
};

const post = (base: string, path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN, ...headers },
    body: JSON.stringify(body),
  });

describe('auth routes (Firebase configured)', () => {
  let ctx: Awaited<ReturnType<typeof start>>;
  before(async () => {
    ctx = await start({
      FIREBASE_API_KEY: 'key',
      FIREBASE_AUTH_DOMAIN: `${PROJECT}.firebaseapp.com`,
      FIREBASE_PROJECT_ID: PROJECT,
      FIREBASE_APP_ID: 'app',
    });
  });
  after(() => ctx.server.close());

  it('publishes the web config', async () => {
    const body = await (await fetch(`${ctx.base}/auth/config`)).json();
    assert.deepEqual(body, {
      configured: true,
      signupMode: 'open',
      apiKey: 'key',
      authDomain: `${PROJECT}.firebaseapp.com`,
      projectId: PROJECT,
      appId: 'app',
    });
  });

  it('refuses cross-site and origin-less POSTs', async () => {
    const cross = await post(
      ctx.base,
      '/auth/session',
      { idToken: token() },
      { Origin: 'https://evil.example' },
    );
    assert.equal(cross.status, 403);
    assert.equal((await cross.json()).code, 'BAD_ORIGIN');
    const none = await fetch(`${ctx.base}/auth/logout`, { method: 'POST' });
    assert.equal(none.status, 403);
  });

  it('rejects bad tokens and unverified password accounts', async () => {
    const bad = await post(ctx.base, '/auth/session', {
      idToken: token().replace(/.$/, 'A') + 'x',
    });
    assert.equal(bad.status, 401);
    const unverified = await post(ctx.base, '/auth/session', {
      idToken: token({ sub: 'uid-u', email_verified: false }),
    });
    assert.equal(unverified.status, 403);
    assert.equal((await unverified.json()).code, 'EMAIL_UNVERIFIED');
  });

  it('exchanges a token for a session cookie, then me and logout', async () => {
    const response = await post(ctx.base, '/auth/session', { idToken: token(), plan: 'pro' });
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie') ?? '';
    assert.match(
      cookie,
      /^th_session=[\w-]{43}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000; Secure$/,
    );
    assert.equal(ctx.provisioned.length, 1);

    const session = cookie.split(';')[0];
    const me = await fetch(`${ctx.base}/auth/me`, { headers: { Cookie: session } });
    assert.deepEqual(await me.json(), {
      user: { email: 'someone@example.com', name: null, avatarUrl: null, role: 'user' },
      plan: { id: 'pro', maxProjects: 3, maxAgents: 10 },
      workspace: { state: 'provisioning' },
    });

    const logout = await post(ctx.base, '/auth/logout', {}, { Cookie: session });
    assert.match(logout.headers.get('set-cookie') ?? '', /Max-Age=0/);
    assert.equal(
      (await fetch(`${ctx.base}/auth/me`, { headers: { Cookie: session } })).status,
      401,
    );
  });
});

describe('auth routes (not configured)', () => {
  let ctx: Awaited<ReturnType<typeof start>>;
  before(async () => {
    ctx = await start({ SIGNUP_MODE: 'invite' });
  });
  after(() => ctx.server.close());

  it('says so on /auth/config and refuses session exchange', async () => {
    assert.deepEqual(await (await fetch(`${ctx.base}/auth/config`)).json(), {
      configured: false,
      signupMode: 'invite',
    });
    const response = await post(ctx.base, '/auth/session', { idToken: token() });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'NOT_CONFIGURED');
  });

  it('rate-limits session exchange per IP', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 22; i += 1) {
      statuses.push(
        (await post(ctx.base, '/auth/session', {}, { 'X-Forwarded-For': '203.0.113.9' })).status,
      );
    }
    assert.equal(statuses.filter((status) => status === 429).length, 2);
  });
});
