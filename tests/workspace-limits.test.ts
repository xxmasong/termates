import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import {
  assertCanCreate,
  assertCwdAllowed,
  CwdOutsideHomeError,
  PlanLimitError,
  readLimit,
} from '../src/workspace-limits.js';

describe('readLimit', () => {
  it('treats unset and blank as unlimited', () => {
    assert.equal(readLimit('project', {}), null);
    assert.equal(readLimit('agent', { TERMHIVE_MAX_AGENTS: '  ' }), null);
  });

  it('parses non-negative integers', () => {
    assert.equal(readLimit('project', { TERMHIVE_MAX_PROJECTS: '3' }), 3);
    assert.equal(readLimit('agent', { TERMHIVE_MAX_AGENTS: '0' }), 0);
  });

  it('fails closed on malformed values', () => {
    assert.equal(readLimit('project', { TERMHIVE_MAX_PROJECTS: 'lots' }), 0);
    assert.equal(readLimit('agent', { TERMHIVE_MAX_AGENTS: '-1' }), 0);
    assert.equal(readLimit('agent', { TERMHIVE_MAX_AGENTS: '2.5' }), 0);
  });
});

describe('assertCanCreate', () => {
  it('allows creates below the limit and when unlimited', () => {
    assert.doesNotThrow(() => assertCanCreate('project', 0, { TERMHIVE_MAX_PROJECTS: '1' }));
    assert.doesNotThrow(() => assertCanCreate('agent', 500, {}));
  });

  it('rejects at the limit with the PLAN_LIMIT payload', () => {
    assert.throws(
      () => assertCanCreate('agent', 3, { TERMHIVE_MAX_AGENTS: '3' }),
      (err: unknown) => {
        assert.ok(err instanceof PlanLimitError);
        assert.deepEqual(err.toJSON(), {
          error: 'Your plan includes 3 agents. Upgrade to add more.',
          code: 'PLAN_LIMIT',
          kind: 'agent',
          limit: 3,
          used: 3,
        });
        return true;
      },
    );
  });

  it('uses the singular noun for a limit of one', () => {
    assert.throws(
      () => assertCanCreate('project', 1, { TERMHIVE_MAX_PROJECTS: '1' }),
      /includes 1 project\. /,
    );
  });
});

describe('storage enforcement', () => {
  const saved = { ...process.env };
  let home = '';
  let storage: typeof import('../src/storage.js');

  before(async () => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'termhive-limits-'));
    process.env.HOME = home;
    process.env.TERMHIVE_MAX_PROJECTS = '2';
    process.env.TERMHIVE_MAX_AGENTS = '3';
    storage = await import('../src/storage.js');
  });

  after(() => {
    process.env = saved;
    fs.rmSync(home, { recursive: true, force: true });
  });

  it('caps projects', () => {
    storage.createProject('one', path.join(home, 'one'));
    storage.createProject('two', path.join(home, 'two'));
    assert.throws(() => storage.createProject('three', path.join(home, 'three')), PlanLimitError);
    assert.equal(storage.listProjects().length, 2);
  });

  it('counts agents across all projects', () => {
    const [first, second] = storage.listProjects();
    storage.createAgent(first.id, 'a', 'claude', first.cwd);
    storage.createAgent(first.id, 'b', 'codex', first.cwd);
    storage.createAgent(second.id, 'c', 'gemini', second.cwd);
    assert.throws(() => storage.createAgent(second.id, 'd', 'claude', second.cwd), PlanLimitError);
    assert.equal(storage.countAllAgents(), 3);
  });

  it('lets creates through again once under the limit', () => {
    const [first] = storage.listProjects();
    const [agent] = storage.listAgents(first.id);
    storage.deleteAgent(first.id, agent.id);
    assert.ok(storage.createAgent(first.id, 'e', 'claude', first.cwd));
  });
});

describe('assertCwdAllowed', () => {
  let home = '';
  let outside = '';

  before(() => {
    home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'termhive-home-')));
    outside = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'termhive-outside-')));
    fs.mkdirSync(path.join(home, 'code'));
    fs.symlinkSync(outside, path.join(home, 'escape'));
  });

  after(() => {
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  });

  const confined = () => ({ HOME: home, TERMHIVE_CONFINE_HOME: '1' });

  it('is a no-op unless TERMHIVE_CONFINE_HOME=1', () => {
    assert.equal(assertCwdAllowed('/etc', { HOME: home }), '/etc');
  });

  it('accepts HOME itself, children, ~ paths and not-yet-created dirs', () => {
    for (const cwd of [home, path.join(home, 'code'), '~', '~/code', '~/new/deep/dir']) {
      assert.equal(assertCwdAllowed(cwd, confined()), cwd);
    }
  });

  it('rejects outside paths, traversal, relative paths and symlink escapes', () => {
    for (const cwd of [
      '/etc',
      outside,
      `${home}-sibling`,
      path.join(home, '..'),
      '~/../',
      'relative/dir',
      path.join(home, 'escape'),
      path.join(home, 'escape', 'sub'),
    ]) {
      assert.throws(() => assertCwdAllowed(cwd, confined()), CwdOutsideHomeError, cwd);
    }
  });
});
