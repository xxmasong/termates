import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CloudDb } from '../../src/cloud/db.js';

describe('CloudDb', () => {
  it('migrates a fresh database and round-trips users and workspaces', () => {
    const db = new CloudDb(':memory:');
    const user = db.insertUser({
      firebaseUid: 'uid-1',
      email: 'a@example.com',
      name: 'A',
      avatarUrl: null,
      plan: 'pro',
      role: 'user',
    });
    assert.equal(db.userByFirebaseUid('uid-1')?.id, user.id);
    assert.equal(db.maxPortBase(), null);
    db.insertWorkspace({ userId: user.id, unixUser: 'th-00000001', portBase: 4010, state: 'provisioning' });
    assert.equal(db.maxPortBase(), 4010);
    db.setWorkspaceState(user.id, 'running');
    assert.equal(db.workspaceByUser(user.id)?.state, 'running');
    assert.equal(db.listUsers()[0].unix_user, 'th-00000001');
    db.close();
  });

  it('consumes invites atomically and respects expiry', () => {
    const db = new CloudDb(':memory:');
    db.insertInvite('h1', 2, null);
    db.insertInvite('h2', 5, new Date(Date.now() - 1000).toISOString());
    assert.equal(db.consumeInvite('h1'), true);
    assert.equal(db.consumeInvite('h1'), true);
    assert.equal(db.consumeInvite('h1'), false);
    assert.equal(db.consumeInvite('h2'), false);
    assert.equal(db.consumeInvite('missing'), false);
    db.close();
  });
});
