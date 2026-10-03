import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MAX_TERMINAL_DIMENSION, parseClientMessage } from '../src/ws-messages.js';

describe('parseClientMessage', () => {
  it('drops frames that are not known message objects', () => {
    for (const frame of [
      'null',
      '1',
      '"x"',
      '[]',
      '{}',
      '{"type":"nope"}',
      'not json',
      '{"type":"__proto__"}',
    ]) {
      assert.equal(parseClientMessage(frame), null, frame);
    }
  });

  it('drops messages with missing or mistyped fields', () => {
    for (const message of [
      { type: 'terminal:attach' },
      { type: 'terminal:attach', agentId: 7 },
      { type: 'terminal:attach', agentId: 'x'.repeat(200) },
      { type: 'terminal:input', agentId: 'a', data: { toString: 1 } },
      { type: 'terminal:resize', agentId: 'a', cols: 'x', rows: 10 },
      { type: 'terminal:resize', agentId: 'a', cols: null, rows: 10 },
      { type: 'brain:send', message: 5 },
      { type: 'brain:switch' },
      { type: 'login:start', cols: 80, rows: 24 },
      { type: 'login:resize', cols: 80 },
    ]) {
      assert.equal(parseClientMessage(JSON.stringify(message)), null, JSON.stringify(message));
    }
  });

  it('keeps valid messages and only their known fields', () => {
    assert.deepEqual(
      parseClientMessage('{"type":"terminal:input","agentId":"a","data":"ls\\r","extra":1}'),
      { type: 'terminal:input', agentId: 'a', data: 'ls\r' },
    );
    assert.deepEqual(parseClientMessage('{"type":"brain:abort"}'), { type: 'brain:abort' });
  });

  it('clamps terminal sizes to what node-pty accepts', () => {
    assert.deepEqual(
      parseClientMessage('{"type":"terminal:resize","agentId":"a","cols":0,"rows":1e9}'),
      { type: 'terminal:resize', agentId: 'a', cols: 1, rows: MAX_TERMINAL_DIMENSION },
    );
    assert.deepEqual(parseClientMessage('{"type":"login:resize","cols":80.7,"rows":-3}'), {
      type: 'login:resize',
      cols: 80,
      rows: 1,
    });
  });
});
