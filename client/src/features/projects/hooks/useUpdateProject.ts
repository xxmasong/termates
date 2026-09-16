import { useMutation, useQueryClient } from '@tanstack/react-query';

import { projectKeys, updateProject } from '../api';
import type { UpdateProjectInput } from '../types';

interface UpdateProjectVariables {
  projectId: string;
  input: UpdateProjectInput;
}

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, input }: UpdateProjectVariables) => updateProject(projectId, input),
    onSuccess: (project) => {
      queryClient.setQueryData(projectKeys.detail(project.id), project);
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
};
