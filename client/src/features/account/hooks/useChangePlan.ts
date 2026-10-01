import { useMutation, useQueryClient } from '@tanstack/react-query';

import { accountKeys, changePlan } from '../api';

/** POST /auth/plan and refresh the cached account + usage. */
export const useChangePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: changePlan,
    onSuccess: (me) => {
      queryClient.setQueryData(accountKeys.me(), me);
      void queryClient.invalidateQueries({ queryKey: accountKeys.usage() });
    },
  });
};
