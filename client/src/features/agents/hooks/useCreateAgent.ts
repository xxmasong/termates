import { useMutation, useQueryClient } from '@tanstack/react-query';

import { agentKeys, createAgent } from '../api';
import type { CreateAgentInput } from '../types';

interface CreateAgentVariables {
  projectId: string;
  input: CreateAgentInput;
}

export const useCreateAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, input }: CreateAgentVariables) => createAgent(projectId, input),
    onSuccess: (_agent, variables) => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.list(variables.projectId) });
    },
  });
};
