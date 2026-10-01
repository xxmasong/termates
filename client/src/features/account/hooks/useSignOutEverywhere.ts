import { useMutation } from '@tanstack/react-query';

import { logoutEverywhere } from '../api';
import { ACCOUNT_ROUTES } from '../constants';

/** End every session of this account, then back to the landing page. */
export const useSignOutEverywhere = () => {
  const mutation = useMutation({
    mutationFn: logoutEverywhere,
    onSettled: () => window.location.assign(ACCOUNT_ROUTES.LANDING),
  });
  return { signOutEverywhere: mutation.mutate, pending: mutation.isPending };
};
