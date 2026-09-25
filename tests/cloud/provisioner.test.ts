import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadConfig } from '../../src/cloud/config.js';
import { CloudDb } from '../../src/cloud/db.js';
import {
  nextPortBase,
  Provisioner,
  unitFor,
  workspaceEnv,
  type Runner,
} from '../../src/cloud/provisioner.js';

const addUser = (db: CloudDb, uid: string) =>
  db.insertUser({
    firebaseUid: uid,
    email: `${uid}@x.test`,
    name: null,
    avatarUrl: null,
    plan: 'free',
    role: 'user',
  });

describe('provisioner', () => {
  it('allocates port blocks from 4010 in steps of 10, reusing gaps', () => {
    const db = new CloudDb(':memory:');
    assert.equal(nextPortBase(db), 4010);
    db.insertWorkspace({
      userId: addUser(db, 'a').id,
      unixUser: 'root',
      portBase: 4000,
      state: 'running',
    });
    db.insertWorkspace({
      userId: addUser(db, 'b').id,
      unixUser: 'th-b',
      portBase: 4010,
      state: 'running',
    });
    db.insertWorkspace({
      userId: addUser(db, 'c').id,
      unixUser: 'th-c',
      portBase: 4030,
      state: 'running',
    });
    assert.equal(nextPortBase(db), 4020);
  });

  it('names units', () => {
    assert.equal(unitFor({ unix_user: 'root' }), 'termhive2.service');
    assert.equal(unitFor({ unix_user: 'th-1a2b3c4d' }), 'termhive-ws@th-1a2b3c4d.service');
  });

  it('writes plan limits, ports and confinement into the env', () => {
    const free = workspaceEnv({ unix_user: 'th-x', port_base: 4020 }, 'free');
    for (const line of [
      'HOME=/home/th-x',
      'PORT=4020',
      'TERMHIVE_DAEMON_PORT=4021',
      'CLAUDE_BRIDGE_PORT=4022',
      'TERMHIVE_MAX_PROJECTS=1',
      'TERMHIVE_MAX_AGENTS=3',
      'TERMHIVE_CONFINE_HOME=1',
    ]) {
      assert.ok(free.split('\n').includes(line), line);
    }
    const plus = workspaceEnv({ unix_user: 'th-x', port_base: 4020 }, 'pro-plus');
    assert.ok(plus.split('\n').includes('TERMHIVE_MAX_PROJECTS='));
    assert.ok(plus.split('\n').includes('TERMHIVE_MAX_AGENTS=30'));
  });

  it('rebuilds the per-user nft allow chain, skipping root and missing users', async () => {
    const db = new CloudDb(':memory:');
    db.insertWorkspace({
      userId: addUser(db, 'a').id,
      unixUser: 'root',
      portBase: 4000,
      state: 'running',
    });
    db.insertWorkspace({
      userId: addUser(db, 'b').id,
      unixUser: 'th-b',
      portBase: 4010,
      state: 'running',
    });
    db.insertWorkspace({
      userId: addUser(db, 'c').id,
      unixUser: 'th-gone',
      portBase: 4020,
      state: 'error',
    });
    const calls: Array<{ command: string; args: string[]; input?: string }> = [];
    const run: Runner = async (command, args, input) => {
      calls.push({ command, args, input });
      if (command === 'id' && args[1] === 'th-b') return { stdout: '20001\n' };
      if (command === 'id') throw new Error('no such user');
      return { stdout: '' };
    };
    await new Provisioner(db, loadConfig({}), run, () => {}).syncFirewall();
    const nft = calls.find((call) => call.command === 'nft');
    assert.deepEqual(nft?.args, ['-f', '-']);
    assert.equal(
      nft?.input,
      'flush chain inet termhive ws_allow\n' +
        'add rule inet termhive ws_allow meta skuid 20001 tcp dport 4010-4012 accept comment "th-b"\n',
    );
  });
});
