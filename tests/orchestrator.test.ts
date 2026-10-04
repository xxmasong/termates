import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import type { BrainEvent, KeeperEngine } from '../src/daemon/protocol.js';

/**
 * Stand-in engine CLIs on PATH: each logs how it was called and streams a
 * minimal answer in its engine's format.
 */
const FAKE_CLI = `#!/usr/bin/env node
const fs = require('fs');
const name = require('path').basename(process.argv[1]);
const args = process.argv.slice(2);
const flag = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
let stdin = '';
process.stdin.on('data', (d) => (stdin += d));
process.stdin.on('end', () => {
  fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify({ name, args, stdin }) + '\\n');
  const out = (o) => console.log(JSON.stringify(o));
  if (name === 'claude') {
    const sid = flag('--session-id') || flag('--resume');
    out({ type: 'system', subtype: 'init', session_id: sid });
    out({ type: 'assistant', message: { content: [{ type: 'text', text: 'claude answer' }] } });
    out({ type: 'result', is_error: false, session_id: sid });
  } else if (name === 'gemini') {
    out({ type: 'init', session_id: flag('--session-id') || flag('--resume') });
    out({ type: 'message', role: 'assistant', content: 'gemini ', delta: true });
    out({ type: 'message', role: 'assistant', content: 'answer', delta: true });
    out({ type: 'result', status: 'success' });
  } else {
    out({ type: 'thread.started', thread_id: 'codex-thread' });
    out({ type: 'item.completed', item: { type: 'agent_message', text: 'codex answer' } });
  }
});
`;

describe('Orchestrator engines', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'termates-orch-'));
  const bin = path.join(root, 'bin');
  const log = path.join(root, 'calls.jsonl');
  const saved = { HOME: process.env.HOME, PATH: process.env.PATH, FAKE_LOG: process.env.FAKE_LOG };
  let Orchestrator: typeof import('../src/daemon/orchestrator.js').Orchestrator;

  const calls = () =>
    fs.readFileSync(log, 'utf-8').trim().split('\n').map((line) => JSON.parse(line) as {
      name: KeeperEngine;
      args: string[];
      stdin: string;
    });
  const flag = (args: string[], f: string) => args[args.indexOf(f) + 1];

  before(async () => {
    fs.mkdirSync(bin);
    for (const name of ['codex', 'claude', 'gemini']) {
      fs.writeFileSync(path.join(bin, name), FAKE_CLI, { mode: 0o755 });
    }
    process.env.HOME = path.join(root, 'home');
    process.env.PATH = `${bin}${path.delimiter}${saved.PATH}`;
    process.env.FAKE_LOG = log;
    // The brain directory is resolved from HOME when the module loads.
    ({ Orchestrator } = await import('../src/daemon/orchestrator.js'));
  });

  after(() => {
    Object.assign(process.env, saved);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('runs the chosen engine, resumes its session and recaps on a switch', async () => {
    const events: BrainEvent[] = [];
    const keeper = new Orchestrator((event) => events.push(event));
    const state = keeper.getState();
    assert.equal(state.engine, 'codex');
    assert.deepEqual(
      state.engines.map((e) => [e.id, e.available]),
      [
        ['codex', true],
        ['claude', true],
        ['gemini', true],
      ],
    );

    keeper.setSettings('claude', 'haiku');
    await keeper.send('first question');
    await keeper.send('second question');
    const [first, second] = calls();
    assert.equal(first.name, 'claude');
    assert.equal(flag(first.args, '--model'), 'haiku');
    const session = flag(first.args, '--session-id');
    assert.ok(session);
    assert.equal(flag(second.args, '--resume'), session);
    assert.match(first.stdin, /^first question/);

    keeper.setSettings('gemini', '');
    await keeper.send('third question');
    const third = calls()[2];
    assert.equal(third.name, 'gemini');
    const prompt = flag(third.args, '-p');
    assert.match(prompt, /Earlier in this conversation/);
    assert.match(prompt, /User: first question/);
    assert.match(prompt, /Keeper: claude answer/);
    assert.ok(prompt.includes('third question'));

    assert.deepEqual(
      keeper.getState().messages.filter((m) => m.role === 'assistant').map((m) => m.text),
      ['claude answer', 'claude answer', 'gemini answer'],
    );

    // Back on claude: its session still exists, so no recap and a resume.
    keeper.setSettings('claude', 'haiku');
    await keeper.send('fourth');
    const fourth = calls()[3];
    assert.equal(flag(fourth.args, '--resume'), session);
    assert.match(fourth.stdin, /^fourth/);
  });

  it('keeps the settings across restarts and ignores invalid ones', () => {
    const keeper = new Orchestrator(() => {});
    assert.equal(keeper.getState().engine, 'claude');
    assert.equal(keeper.getState().model, 'haiku');
    keeper.setSettings('shell' as KeeperEngine, '');
    keeper.setSettings('codex', '--dangerously-bypass-approvals-and-sandbox');
    assert.equal(keeper.getState().engine, 'claude');
  });

  it('migrates a pre-engine conversation thread to the codex session', async () => {
    const brain = path.join(process.env.HOME!, '.termates', 'brain');
    fs.writeFileSync(
      path.join(brain, 'state.json'),
      JSON.stringify({
        conversations: [
          { id: 'c1', title: 'Old', threadId: 'old-thread', messages: [], createdAt: 'x', updatedAt: 'x' },
        ],
        currentId: 'c1',
      }),
    );
    const keeper = new Orchestrator(() => {});
    assert.equal(keeper.getState().engine, 'codex');
    await keeper.send('continue');
    const last = calls().at(-1)!;
    assert.equal(last.name, 'codex');
    assert.deepEqual(last.args.slice(0, 3), ['exec', 'resume', 'old-thread']);
  });
});
