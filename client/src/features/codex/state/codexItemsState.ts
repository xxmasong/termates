import { atomFamily } from 'recoil';

import type { CodexItem } from '@/types';

export const codexItemsByAgentState = atomFamily<CodexItem[], string>({
  default: [],
  key: 'codex.itemsByAgent',
});
