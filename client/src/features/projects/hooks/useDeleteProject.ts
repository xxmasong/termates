import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteProject, projectKeys } from '../api';
import type { DeleteProjectInput } from '../types';

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, removeData }: DeleteProjectInput) =>
      deleteProject(projectId, removeData),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.removeQueries({ queryKey: projectKeys.detail(variables.projectId) });
    },
  });
};
