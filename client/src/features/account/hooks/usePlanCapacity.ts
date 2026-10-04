import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSetRecoilState } from 'recoil';

import { accountKeys, fetchMe, fetchUsage } from '../api';
import { planLimitDialogState } from '../state';
import type { PlanLimit } from '../types';

/**
 * Checks the plan before a create form opens, so a user at their limit sees
 * the upgrade dialog straight away instead of after filling the form in. The
 * server still enforces the limit; if the check itself fails, the form opens.
 */
export const usePlanCapacity = () => {
  const queryClient = useQueryClient();
  const setLimit = useSetRecoilState(planLimitDialogState);

  return useCallback(
    async (kind: PlanLimit['kind']): Promise<boolean> => {
      try {
        const [me, usage] = await Promise.all([
          queryClient.ensureQueryData({ queryKey: accountKeys.me(), queryFn: fetchMe }),
          queryClient.fetchQuery({
            queryKey: accountKeys.usage(),
            queryFn: fetchUsage,
            staleTime: 0,
          }),
        ]);
        if (!me) return true;
        const limit = kind === 'project' ? me.plan.maxProjects : me.plan.maxAgents;
        const used = kind === 'project' ? usage.projects : usage.agents;
        if (limit === null || used < limit) return true;
        setLimit({ kind, limit, used });
        return false;
      } catch {
        return true;
      }
    },
    [queryClient, setLimit],
  );
};
