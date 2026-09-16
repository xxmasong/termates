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

/** Keyed by CLI name — 'claude' and 'codex' today. */
export type UsageSummary = Record<string, CliUsage | null | undefined>;

export type SpeechResultHandler = (text: string, final: boolean) => void;
