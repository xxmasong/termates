import { useMutation, useQueryClient } from '@tanstack/react-query';

import { agentKeys, deleteAgent } from '../api';

interface DeleteAgentVariables {
  projectId: string;
  agentId: string;
}

export const useDeleteAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, agentId }: DeleteAgentVariables) => deleteAgent(projectId, agentId),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.list(variables.projectId) });
      void queryClient.invalidateQueries({ queryKey: agentKeys.previews(variables.projectId) });
    },
  });
};
