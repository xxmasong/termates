import { useCallback } from 'react';
import { useRecoilState } from 'recoil';

import { accountModalState } from '../state';
import type { AccountTab } from '../types';

export const useAccountModal = () => {
  const [state, setState] = useRecoilState(accountModalState);

  const open = useCallback((tab: AccountTab = 'plan') => setState({ open: true, tab }), [setState]);
  const close = useCallback(() => setState((current) => ({ ...current, open: false })), [setState]);
  const setTab = useCallback(
    (tab: string) => setState((current) => ({ ...current, tab: tab as AccountTab })),
    [setState],
  );

  return { ...state, open, close, setTab, isOpen: state.open };
};
