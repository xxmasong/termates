import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';

import { getEvents, pushEvent } from '../src/activity.js';

describe('activity history', () => {
  const saved = process.env.HOME;
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'termhive-activity-'));
  const other = fs.mkdtempSync(path.join(os.tmpdir(), 'termhive-activity-other-'));

  after(() => {
    process.env.HOME = saved;
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(other, { recursive: true, force: true });
  });

  it('survives a restart and skips a torn last line', () => {
    process.env.HOME = home;
    pushEvent({ projectId: 'p1', event: 'agent:started', detail: 'a started', agentName: 'a' });
    pushEvent({ projectId: 'p2', event: 'agent:stopped', detail: 'b stopped', agentName: 'b' });
    const log = path.join(home, '.termates', 'activity.jsonl');
    fs.appendFileSync(log, '{"id":"torn');

    // A different HOME, then back, reloads from disk as a fresh process would.
    process.env.HOME = other;
    assert.deepEqual(getEvents(), []);
    process.env.HOME = home;

    const events = getEvents();
    assert.deepEqual(
      events.map((event) => event.detail),
      ['a started', 'b stopped'],
    );
    assert.deepEqual(
      getEvents('p2').map((event) => event.agentName),
      ['b'],
    );
    assert.equal(fs.statSync(log).mode & 0o777, 0o600);

    // The next event lands on its own line, not glued to the torn one.
    pushEvent({ projectId: 'p1', event: 'agent:stopped', detail: 'a stopped', agentName: 'a' });
    process.env.HOME = other;
    getEvents();
    process.env.HOME = home;
    assert.equal(getEvents().at(-1)?.detail, 'a stopped');
  });
});
