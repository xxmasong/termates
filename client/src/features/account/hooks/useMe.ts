import { useQuery } from '@tanstack/react-query';

import { accountKeys, fetchMe } from '../api';
import { ME_STALE_MS, PROVISIONING_POLL_MS } from '../constants';

/** The signed-in account; polls while its workspace is still provisioning. */
export const useMe = () =>
  useQuery({
    queryKey: accountKeys.me(),
    queryFn: fetchMe,
    staleTime: ME_STALE_MS,
    refetchInterval: (query) =>
      query.state.data?.workspace.state === 'provisioning' ? PROVISIONING_POLL_MS : false,
  });
