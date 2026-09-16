import type { BrainState } from '@/types';

export const EMPTY_BRAIN_STATE: BrainState = {
  conversations: [],
  currentId: '',
  engine: 'codex',
  messages: [],
  status: 'idle',
};
