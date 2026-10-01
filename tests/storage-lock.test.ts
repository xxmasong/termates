import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';

import { StorageBusyError, withStorageLock } from '../src/storage-lock.js';

const UPDATES = 40;

if (!isMainThread) {
  // Worker: hammer one agent's field while another worker hammers another's.
  const { home, projectId, agentId, field } = workerData as Record<string, string>;
  process.env.HOME = home;
  const storage = await import('../src/storage.js');
  for (let i = 1; i <= UPDATES; i += 1)
    storage.updateAgent(projectId, agentId, { [field]: String(i) });
  parentPort?.postMessage('done');
} else {
  describe('withStorageLock', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'th-lock-'));
    const lock = path.join(dir, '.lock');
    after(() => fs.rmSync(dir, { recursive: true, force: true }));

    it('is re-entrant and releases the lock', () => {
      const value = withStorageLock(lock, () => withStorageLock(lock, () => 42));
      assert.equal(value, 42);
      assert.ok(!fs.existsSync(lock));
    });

    it('breaks a stale lock left by a crashed process', () => {
      fs.mkdirSync(lock);
      const old = new Date(Date.now() - 60_000);
      fs.utimesSync(lock, old, old);
      assert.equal(
        withStorageLock(lock, () => 'ok'),
        'ok',
      );
    });

    it('gives up with StorageBusyError when a live lock is held too long', () => {
      fs.mkdirSync(lock);
      try {
        assert.throws(() => withStorageLock(lock, () => 'never'), StorageBusyError);
      } finally {
        fs.rmSync(lock, { recursive: true, force: true });
      }
    });
  });

  describe('concurrent writers', () => {
    const saved = { ...process.env };
    let home = '';
    let storage: typeof import('../src/storage.js');

    before(async () => {
      home = fs.mkdtempSync(path.join(os.tmpdir(), 'th-race-'));
      process.env.HOME = home;
      delete process.env.TERMHIVE_MAX_AGENTS;
      delete process.env.TERMHIVE_LIMITS_FILE;
      storage = await import('../src/storage.js');
    });
    after(() => {
      process.env = saved;
      fs.rmSync(home, { recursive: true, force: true });
    });

    it('never loses an update when two processes write the same project', async () => {
      const project = storage.createProject('race', path.join(home, 'race'));
      const a = storage.createAgent(project.id, 'A', 'claude', path.join(home, 'race'));
      const b = storage.createAgent(project.id, 'B', 'codex', path.join(home, 'race'));
      assert.ok(a && b);
      const run = (agentId: string, field: string) =>
        new Promise<void>((resolve, reject) => {
          const worker = new Worker(new URL(import.meta.url), {
            workerData: { home, projectId: project.id, agentId, field },
          });
          worker.once('message', () => resolve());
          worker.once('error', reject);
        });
      await Promise.all([run(a.id, 'model'), run(b.id, 'effort')]);
      const final = storage.listAgents(project.id);
      assert.equal(final.find((x) => x.id === a.id)?.model, String(UPDATES));
      assert.equal(final.find((x) => x.id === b.id)?.effort, String(UPDATES));
    });
  });
}
