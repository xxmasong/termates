import { useCallback } from 'react';
import { useRecoilState } from 'recoil';

import { planLimitDialogState } from '../state';
import { planLimitFromError } from '../utils';

/** Opens the upgrade dialog for a PLAN_LIMIT error; `offer` says whether it did. */
export const usePlanLimitDialog = () => {
  const [limit, setLimit] = useRecoilState(planLimitDialogState);

  const offer = useCallback(
    (error: unknown): boolean => {
      const next = planLimitFromError(error);
      if (next) setLimit(next);
      return Boolean(next);
    },
    [setLimit],
  );
  const close = useCallback(() => setLimit(null), [setLimit]);

  return { limit, offer, close };
};
