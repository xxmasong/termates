import { atom } from 'recoil';

import type { PlanLimit } from '../types';

/** The limit that blocked the last create, while the upgrade dialog is open. */
export const planLimitDialogState = atom<PlanLimit | null>({
  default: null,
  key: 'account.planLimitDialog',
});
