import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createProject, projectKeys } from '../api';

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
};
