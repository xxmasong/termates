export type SessionStatus = 'signed-in' | 'signed-out' | 'unknown';
export type SimStatus = 'running' | 'idle' | 'awaiting input';

export interface SimPane {
  id: 'claude' | 'codex' | 'gemini' | 'opencode';
  cli: string;
  role: string;
  status: SimStatus;
  lines: readonly string[];
}

export interface SimStep {
  paneId?: SimPane['id'];
  lines?: readonly string[];
  message?: boolean;
  keeper?: boolean;
}

export interface NavLink {
  label: string;
  href: string;
}
export interface FaqEntry {
  question: string;
  answer: string;
}
export interface ComparisonRow {
  label: string;
  values: readonly ComparisonValue[];
}
export type ComparisonValue = 'yes' | 'partial' | 'no';
