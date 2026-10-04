import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadConfig, sanitizeVoiceConfig } from '../src/voice/config.js';

describe('sanitizeVoiceConfig', () => {
  it('keeps valid settings and drops unknown fields', () => {
    const next = sanitizeVoiceConfig(
      { stt: { provider: 'gemini', model: 'gemini-3.8-flash', language: 'zh-TW', extra: 1 }, tts: { speed: 9 } },
      loadConfig(),
    );
    assert.deepEqual(next.stt, {
      provider: 'gemini',
      model: 'gemini-3.8-flash',
      language: 'zh-TW',
      saveRecordings: false,
    });
    assert.equal(next.tts.speed, 4);
  });

  it('keeps the current value for anything invalid', () => {
    const current = loadConfig();
    const next = sanitizeVoiceConfig(
      {
        stt: { provider: 'shell', model: '../../v1/files?x=', language: 'en; rm', saveRecordings: 'yes' },
        tts: { voice: { toString: 'x' }, speed: Number.NaN, enabled: 0 },
      },
      current,
    );
    assert.deepEqual(next, current);
  });
});
