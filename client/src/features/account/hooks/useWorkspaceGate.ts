import { useCallback, useEffect, useMemo } from 'react';

import { ACCOUNT_ROUTES } from '../constants';
import type { WorkspaceGateStatus } from '../types';
import { useMe } from './useMe';

/** What /app should show: sign-in redirect, provisioning, error or the shell. */
export const useWorkspaceGate = () => {
  const me = useMe();

  const status = useMemo<WorkspaceGateStatus>(() => {
    if (me.isPending) return 'loading';
    if (me.isError) return 'error';
    if (!me.data) return 'unauthenticated';
    if (me.data.workspace.state === 'provisioning') return 'provisioning';
    if (me.data.workspace.state === 'error') return 'error';
    return 'ready';
  }, [me.data, me.isError, me.isPending]);

  useEffect(() => {
    if (status === 'unauthenticated') window.location.replace(ACCOUNT_ROUTES.LOGIN);
  }, [status]);

  const { refetch } = me;
  const retry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return { status, retry };
};
