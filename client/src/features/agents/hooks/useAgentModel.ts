import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Agent } from '@/types';

import { agentKeys, restartAgent, updateAgent } from '../api';

interface ChangeModelVariables {
  agent: Agent;
  patch: { model?: string; effort?: string; thinking?: string; permissionMode?: string; autocompact?: string; flags?: Agent['flags'] };
}

/**
 * Persist a model / effort choice and apply it.
 *
 * Both are launch flags, so a running CLI cannot pick them up in place: the
 * agent is restarted after the update. A stopped agent is only updated, and
 * takes the new value on its next start.
 */
export const useAgentModel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ agent, patch }: ChangeModelVariables) => {
      const updated = await updateAgent(agent.projectId, agent.id, patch);

      if (agent.status !== 'stopped') {
        await restartAgent(agent.projectId, agent.id);
      }

      return updated;
    },
    onSuccess: (agent) => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.list(agent.projectId) });
    },
  });
};
