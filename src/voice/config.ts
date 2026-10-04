/**
 * Voice settings persistence — provider/model/voice selections live in
 * ~/.termates/voice.json so they survive across daemon/web restarts. API keys
 * never live here — those go in .env.
 */

import fs from 'fs';
import path from 'path';

import { appHomeDir } from '../app-home.js';

const VOICE_DIR = appHomeDir();
const VOICE_PATH = path.join(VOICE_DIR, 'voice.json');
/**
 * API keys live in a SEPARATE file so settings (safe to share / paste) stay
 * cleanly apart from secrets. Both files live under ~/.termates — outside any
 * git repo — and are never echoed back to the browser in plain text.
 */
const KEYS_PATH = path.join(VOICE_DIR, 'api-keys.json');

export interface VoiceConfig {
  stt: {
    provider: 'browser' | 'openai' | 'gemini';
    model: string;
    language: string;
    /** Save each captured clip to ~/.termates/voice-debug/ — for diagnosing
     *  bad transcription / mic quality. Off by default (privacy). */
    saveRecordings: boolean;
  };
  tts: {
    enabled: boolean;
    provider: 'browser' | 'openai' | 'gemini';
    model: string;
    voice: string;
    /** Playback rate, 0.25–4.0. Honoured by OpenAI; Gemini ignores it. */
    speed: number;
  };
}

const DEFAULT: VoiceConfig = {
  stt: { provider: 'browser', model: '', language: '', saveRecordings: false },
  tts: { enabled: true, provider: 'browser', model: '', voice: '', speed: 1.0 },
};

export function loadConfig(): VoiceConfig {
  try {
    if (fs.existsSync(VOICE_PATH)) {
      const raw = JSON.parse(fs.readFileSync(VOICE_PATH, 'utf-8'));
      return {
        stt: { ...DEFAULT.stt, ...(raw.stt || {}) },
        tts: { ...DEFAULT.tts, ...(raw.tts || {}) },
      };
    }
  } catch { /* fall through */ }
  return structuredClone(DEFAULT);
}

const PROVIDER_IDS = ['browser', 'openai', 'gemini'] as const;
/** Model and voice ids end up in provider URLs and request bodies. */
const VOICE_TOKEN = /^[A-Za-z0-9][\w.:-]{0,99}$/;
const LANGUAGE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

const provider = (value: unknown, fallback: VoiceConfig['stt']['provider']) =>
  (PROVIDER_IDS as readonly unknown[]).includes(value) ? (value as VoiceConfig['stt']['provider']) : fallback;
const token = (value: unknown, fallback: string, pattern = VOICE_TOKEN) =>
  value === '' ? '' : typeof value === 'string' && pattern.test(value) ? value : fallback;
const flag = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);

/**
 * The voice settings a client sent, merged over `current`: unknown fields are
 * dropped and every invalid value keeps the current one.
 */
export function sanitizeVoiceConfig(input: { stt?: unknown; tts?: unknown }, current: VoiceConfig): VoiceConfig {
  const stt = (input.stt && typeof input.stt === 'object' ? input.stt : {}) as Record<string, unknown>;
  const tts = (input.tts && typeof input.tts === 'object' ? input.tts : {}) as Record<string, unknown>;
  const speed = typeof tts.speed === 'number' && Number.isFinite(tts.speed) ? tts.speed : current.tts.speed;
  return {
    stt: {
      provider: provider(stt.provider, current.stt.provider),
      model: token(stt.model, current.stt.model),
      language: token(stt.language, current.stt.language, LANGUAGE),
      saveRecordings: flag(stt.saveRecordings, current.stt.saveRecordings),
    },
    tts: {
      enabled: flag(tts.enabled, current.tts.enabled),
      provider: provider(tts.provider, current.tts.provider),
      model: token(tts.model, current.tts.model),
      voice: token(tts.voice, current.tts.voice),
      speed: Math.min(4, Math.max(0.25, speed)),
    },
  };
}

export function saveConfig(cfg: VoiceConfig): void {
  fs.mkdirSync(VOICE_DIR, { recursive: true });
  fs.writeFileSync(VOICE_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
}

/** API keys — stored in api-keys.json. .env still wins as an explicit override. */
export interface ApiKeys { openai?: string; gemini?: string }

export function loadApiKeys(): ApiKeys {
  try {
    if (fs.existsSync(KEYS_PATH)) {
      const raw = JSON.parse(fs.readFileSync(KEYS_PATH, 'utf-8'));
      return {
        openai: typeof raw.openai === 'string' ? raw.openai : undefined,
        gemini: typeof raw.gemini === 'string' ? raw.gemini : undefined,
      };
    }
  } catch { /* ignore */ }
  return {};
}

/**
 * Merge-save: only fields present in `partial` change; an empty-string value
 * means "clear this key" (delete the entry).
 */
export function saveApiKeys(partial: ApiKeys): void {
  fs.mkdirSync(VOICE_DIR, { recursive: true });
  const cur = loadApiKeys();
  const next: ApiKeys = { ...cur };
  for (const k of ['openai', 'gemini'] as const) {
    const v = partial[k];
    if (typeof v !== 'string') continue;
    if (v === '') delete next[k];
    else next[k] = v;
  }
  // Created owner-only, so the keys are never briefly world-readable.
  fs.writeFileSync(KEYS_PATH, JSON.stringify(next, null, 2), { encoding: 'utf-8', mode: 0o600 });
  // Best-effort owner-only permissions (Windows ignores this — file lives in
  // the user's profile so the OS ACL already restricts access).
  try { fs.chmodSync(KEYS_PATH, 0o600); } catch { /* ignore */ }
}

export function getApiKey(provider: 'openai' | 'gemini'): string | undefined {
  // .env takes precedence (explicit override for power users / CI), then file.
  if (provider === 'openai') {
    return process.env.OPENAI_API_KEY || loadApiKeys().openai || undefined;
  }
  if (provider === 'gemini') {
    return (
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      loadApiKeys().gemini ||
      undefined
    );
  }
  return undefined;
}

export function hasKey(provider: 'browser' | 'openai' | 'gemini'): boolean {
  if (provider === 'browser') return true;
  return !!getApiKey(provider);
}
