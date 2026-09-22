export {};
export const WAKE_WORD_ARM_TIMEOUT_MS = 9_000;
export const WAKE_WORD_RESTART_MS = 600;

/** CLIs shown in the sidebar usage meters, keyed as /api/usage returns them. */
export const USAGE_METER_CLIS = [
  { color: 'var(--h-devops)', key: 'claude', label: 'Claude' },
  { color: 'var(--h-backend)', key: 'codex', label: 'Codex' },
  { color: 'var(--h-frontend)', key: 'gemini', label: 'Gemini' },
] as const;

/**
 * Gemini has no quota API, so its figure is a local request count against the
 * published free-tier daily limit rather than a number from Google.
 */
export const USAGE_APPROXIMATE_CLIS = new Set(['gemini']);

/** Gemini's limit is per-day, not the session/week pair the others report. */
export const USAGE_SESSION_LABELS: Record<string, string> = { gemini: 'Day' };
