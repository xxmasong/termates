export {};
export type SpeechProvider = 'browser' | 'openai' | 'gemini';

export interface VoiceConfig {
  provider?: SpeechProvider;
  language?: string;
  wakeWordEnabled?: boolean;
  wakeWord?: string;
  ttsVoice?: string;
  [key: string]: unknown;
}

export interface TextToSpeechInput {
  text: string;
  voice?: string;
}

export interface UsageWindow {
  utilization: number;
  resetsAt: string;
}

export interface CliUsage {
  session: UsageWindow | null;
  week: UsageWindow | null;
  updatedAt: string;
}

/** Keyed by CLI name — 'claude', 'codex' and 'gemini' today. */
export type UsageSummary = Record<string, CliUsage | null | undefined>;

export type SpeechResultHandler = (text: string, final: boolean) => void;

/** One CLI's stored credential state, as /api/auth reports it. */
export interface CliAuth {
  loggedIn: boolean;
  account: string | null;
  plan: string | null;
  expiresAt: string | null;
  expired: boolean;
  /** How to sign in; these CLIs cannot be signed in from a browser. */
  loginCommand: string;
  /** False when the CLI only signs out from inside its own session. */
  canLogout: boolean;
}

export type AuthSummary = Record<string, CliAuth | undefined>;
