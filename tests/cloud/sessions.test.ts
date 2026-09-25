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
    for (const part of [
      'th_session=tok',
      'HttpOnly',
      'SameSite=Lax',
      'Secure',
      'Path=/',
      'Max-Age=2592000',
    ]) {
      assert.ok(cookie.includes(part), part);
    }
    assert.ok(!sessionCookie('tok', false).includes('Secure'));
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
