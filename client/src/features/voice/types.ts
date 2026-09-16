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

export type UsageSummary = Record<string, unknown>;

export type SpeechResultHandler = (text: string, final: boolean) => void;
