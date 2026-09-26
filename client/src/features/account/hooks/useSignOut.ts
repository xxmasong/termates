import { useMutation } from '@tanstack/react-query';

import { logout } from '../api';
import { ACCOUNT_ROUTES } from '../constants';

/** POST /auth/logout, then back to the landing page. */
export const useSignOut = () => {
  const mutation = useMutation({
    mutationFn: logout,
    onSettled: () => window.location.assign(ACCOUNT_ROUTES.LANDING),
  });
  return { signOut: mutation.mutate, pending: mutation.isPending };
};
