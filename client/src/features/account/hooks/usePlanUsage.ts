import { useQuery } from '@tanstack/react-query';

import { accountKeys, fetchUsage } from '../api';

/** Live project/agent counts; only fetched while something shows them. */
export const usePlanUsage = (enabled: boolean) =>
  useQuery({
    enabled,
    queryKey: accountKeys.usage(),
    queryFn: fetchUsage,
    staleTime: 0,
  });
