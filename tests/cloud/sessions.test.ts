import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CloudDb } from '../../src/cloud/db.js';
import {
  createSession,
  hashToken,
  parseCookies,
  resolveSession,
  sessionCookie,
} from '../../src/cloud/sessions.js';

const setup = () => {
  const db = new CloudDb(':memory:');
  const user = db.insertUser({
    firebaseUid: 'u1',
    email: 'u1@example.com',
    name: null,
    avatarUrl: null,
    plan: 'free',
    role: 'user',
  });
  return { db, user };
};

describe('sessions', () => {
  it('parses cookie headers', () => {
    assert.deepEqual(parseCookies('a=1; th_session=abc%3D; b'), { a: '1', th_session: 'abc=' });
    assert.deepEqual(parseCookies(undefined), {});
  });

  it('builds a hardened cookie', () => {
    const cookie = sessionCookie('tok', true);
    assert.ok(cookie.startsWith('__Host-th_session=tok;'));
    assert.ok(!cookie.includes('Domain'), '__Host- cookies must not set a Domain');
    for (const part of ['HttpOnly', 'SameSite=Lax', 'Secure', 'Path=/', 'Max-Age=2592000']) {
      assert.ok(cookie.includes(part), part);
    }
    assert.ok(!sessionCookie('tok', false).includes('Secure'));
    assert.ok(sessionCookie('tok', false).startsWith('th_session=tok;'));
  });

  it('accepts the __Host- cookie and still the legacy name', () => {
    const { db, user } = setup();
    const { token } = createSession(db, user.id, { ip: null, userAgent: null });
    for (const name of ['__Host-th_session', 'th_session']) {
      assert.equal(
        resolveSession(db, { headers: { cookie: `${name}=${token}` } })?.user.id,
        user.id,
      );
    }
  });

  it('ends idle sessions and refreshes last_seen_at lazily', () => {
    const { db, user } = setup();
    const { token } = createSession(db, user.id, { ip: null, userAgent: null });
    const cookie = { headers: { cookie: `__Host-th_session=${token}` } };
    const hash = hashToken(token);
    const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

    db.raw.prepare('UPDATE sessions SET last_seen_at = ?').run(daysAgo(1));
    assert.ok(resolveSession(db, cookie));
    assert.ok(Date.now() - Date.parse(db.sessionByHash(hash)?.last_seen_at ?? '') < 60_000);

    db.raw.prepare('UPDATE sessions SET last_seen_at = ?').run(daysAgo(15));
    assert.equal(resolveSession(db, cookie), null);
    assert.equal(db.sessionByHash(hash), undefined);
  });

  it('stores only the token hash and resolves the user', () => {
    const { db, user } = setup();
    const { token } = createSession(db, user.id, { ip: '127.0.0.1', userAgent: 'test' });
    assert.equal(token.length, 43);
    assert.equal(db.sessionByHash(token), undefined);
    assert.ok(db.sessionByHash(hashToken(token)));
    const resolved = resolveSession(db, { headers: { cookie: `x=1; th_session=${token}` } });
    assert.equal(resolved?.user.id, user.id);
    assert.equal(resolveSession(db, { headers: { cookie: 'th_session=forged' } }), null);
  });

  it('drops expired sessions and suspended users', () => {
    const { db, user } = setup();
    const { token } = createSession(db, user.id, { ip: null, userAgent: null });
    db.raw
      .prepare('UPDATE sessions SET expires_at = ?')
      .run(new Date(Date.now() - 1).toISOString());
    assert.equal(resolveSession(db, { headers: { cookie: `th_session=${token}` } }), null);
    assert.equal(db.sessionByHash(hashToken(token)), undefined);

    const second = createSession(db, user.id, { ip: null, userAgent: null });
    db.setUserStatus(user.id, 'suspended');
    assert.equal(resolveSession(db, { headers: { cookie: `th_session=${second.token}` } }), null);
  });
});

describe('clientIp', () => {
  it('trusts only the last X-Forwarded-For hop', async () => {
    const { clientIp } = await import('../../src/cloud/guards.js');
    const req = (xff: string | undefined) =>
      ({
        headers: xff === undefined ? {} : { 'x-forwarded-for': xff },
        socket: { remoteAddress: '127.0.0.1' },
      }) as never;
    assert.equal(clientIp(req('6.6.6.6, 100.64.1.2')), '100.64.1.2');
    assert.equal(clientIp(req('100.64.1.2')), '100.64.1.2');
    assert.equal(clientIp(req(undefined)), '127.0.0.1');
  });
});
