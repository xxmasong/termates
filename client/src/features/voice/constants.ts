export {};
export const WAKE_WORD_ARM_TIMEOUT_MS = 9_000;
export const WAKE_WORD_RESTART_MS = 600;

/** CLIs shown in the sidebar usage meters, keyed as /api/usage returns them. */
export const USAGE_METER_CLIS = [
  { color: 'var(--h-devops)', key: 'claude', label: 'Claude' },
  { color: 'var(--h-backend)', key: 'codex', label: 'Codex' },
] as const;
