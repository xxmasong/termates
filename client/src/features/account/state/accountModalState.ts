import { atom } from 'recoil';

import type { AccountModalState } from '../types';

/** The Account & settings modal — opened from the user menu or a plan limit. */
export const accountModalState = atom<AccountModalState>({
  default: { open: false, tab: 'plan' },
  key: 'account.modal',
});
