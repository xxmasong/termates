import type { BrainState } from '@/types';

export const EMPTY_BRAIN_STATE: BrainState = {
  conversations: [],
  currentId: '',
  engine: 'codex',
  engines: [],
  messages: [],
  model: '',
  status: 'idle',
};

export const KEEPER_ENGINE_COPY = {
  engineLabel: 'Keeper engine',
  modelLabel: 'Keeper model',
  defaultModel: 'Model: default',
  notInstalled: (label: string) => `${label} (not installed)`,
  busy: 'Wait for the Keeper to finish before switching',
} as const;
