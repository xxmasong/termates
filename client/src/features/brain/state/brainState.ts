import { atom } from 'recoil';

import type { BrainState } from '@/types';

import { EMPTY_BRAIN_STATE } from '../constants';

export const brainStateAtom = atom<BrainState>({
  default: EMPTY_BRAIN_STATE,
  key: 'brain.state',
});
