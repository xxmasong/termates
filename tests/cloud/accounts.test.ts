import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AccountError,
  Accounts,
  generateInviteCode,
  hashInvite,
} from '../../src/cloud/accounts.js';
import { loadConfig } from '../../src/cloud/config.js';
import { CloudDb } from '../../src/cloud/db.js';
import type { FirebaseClaims } from '../../src/cloud/firebase-token.js';

const claims = (overrides: Partial<FirebaseClaims> = {}): FirebaseClaims => ({
  sub: 'uid-1',
  aud: 'p',
  iss: 'https://securetoken.google.com/p',
  exp: 0,
  iat: 0,
  auth_time: 0,
  email: 'user@example.com',
  email_verified: true,
  firebase: { sign_in_provider: 'password' },
  ...overrides,
});

const setup = (env: Record<string, string> = {}) => {
  const db = new CloudDb(':memory:');
  const accounts = new Accounts(db, loadConfig({ ADMIN_EMAILS: 'boss@example.com', ...env }));
  return { db, accounts };
};

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (err) {
    assert.ok(err instanceof AccountError);
    return err.code;
  }
  return 'OK';
};

describe('Accounts.signIn', () => {
  it('creates a user with the requested plan and a provisioning workspace', () => {
    const { accounts } = setup();
    const result = accounts.signIn(claims(), { plan: 'pro' });
    assert.equal(result.created, true);
    assert.equal(result.user.plan, 'pro');
    assert.equal(result.user.role, 'user');
    assert.equal(result.workspace.port_base, 4010);
    assert.match(result.workspace.unix_user, /^th-[0-9a-f]{8}$/);
    assert.equal(result.needsProvision, true);
    assert.deepEqual(accounts.me(result.user).plan, { id: 'pro', maxProjects: 3, maxAgents: 10 });
  });

  it('ignores unknown plans and is idempotent on repeat sign-in', () => {
    const { accounts } = setup();
    const first = accounts.signIn(claims(), { plan: 'enterprise' });
    assert.equal(first.user.plan, 'free');
    const again = accounts.signIn(claims({ name: 'New Name' }), { plan: 'pro-plus' });
    assert.equal(again.created, false);
    assert.equal(again.user.plan, 'free');
    assert.equal(again.user.name, 'New Name');
    assert.equal(again.workspace.unix_user, first.workspace.unix_user);
  });

  it('requires a verified email for password accounts only', () => {
    const { accounts } = setup();
    assert.equal(
      code(() => accounts.signIn(claims({ email_verified: false }), {})),
      'EMAIL_UNVERIFIED',
    );
    assert.equal(
      code(() =>
        accounts.signIn(
          claims({ email_verified: false, firebase: { sign_in_provider: 'github.com' } }),
          {},
        ),
      ),
      'OK',
    );
  });

  it('enforces invite mode and consumes invites', () => {
    const { db, accounts } = setup({ SIGNUP_MODE: 'invite' });
    const invite = generateInviteCode();
    assert.match(invite, /^HIVE-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    db.insertInvite(hashInvite(invite), 1, null);
    assert.equal(
      code(() => accounts.signIn(claims(), {})),
      'SIGNUPS_CLOSED',
    );
    assert.equal(
      code(() => accounts.signIn(claims(), { inviteCode: 'HIVE-NOPE-NOPE' })),
      'INVALID_INVITE',
    );
    assert.equal(
      code(() => accounts.signIn(claims(), { inviteCode: ` ${invite.toLowerCase()} ` })),
      'OK',
    );
    assert.equal(
      code(() => accounts.signIn(claims({ sub: 'uid-2' }), { inviteCode: invite })),
      'INVALID_INVITE',
    );
    assert.equal(db.listUsers().length, 1);
  });

  it('open mode ignores a bad invite code', () => {
    const { accounts } = setup();
    assert.equal(
      code(() => accounts.signIn(claims(), { inviteCode: 'HIVE-NOPE-NOPE' })),
      'OK',
    );
  });

  it('links the first verified admin to the root workspace, later admins get their own', () => {
    const { accounts } = setup({ SIGNUP_MODE: 'invite' });
    const boss = accounts.signIn(claims({ sub: 'boss', email: 'Boss@Example.com' }), {});
    assert.equal(boss.user.role, 'admin');
    assert.equal(boss.user.plan, 'pro-plus');
    assert.equal(boss.workspace.unix_user, 'root');
    assert.equal(boss.workspace.port_base, 4000);
    assert.equal(boss.needsProvision, false);
    const second = accounts.signIn(
      claims({
        sub: 'boss-github',
        email: 'boss@example.com',
        firebase: { sign_in_provider: 'github.com' },
      }),
      {},
    );
    assert.equal(second.workspace.port_base, 4010);
  });

  it('never grants admin on an unverified email', () => {
    const { accounts } = setup();
    const result = accounts.signIn(
      claims({
        sub: 'x',
        email: 'boss@example.com',
        email_verified: false,
        firebase: { sign_in_provider: 'github.com' },
      }),
      {},
    );
    assert.equal(result.user.role, 'user');
    assert.notEqual(result.workspace.unix_user, 'root');
  });

  it('refuses suspended users', () => {
    const { db, accounts } = setup();
    const { user } = accounts.signIn(claims(), {});
    db.setUserStatus(user.id, 'suspended');
    assert.equal(
      code(() => accounts.signIn(claims(), {})),
      'ACCOUNT_SUSPENDED',
    );
  });
});
