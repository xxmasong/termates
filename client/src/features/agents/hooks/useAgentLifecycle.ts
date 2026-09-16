import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Agent, AgentStatus } from '@/types';

import { agentKeys, restartAgent, startAgent, stopAgent } from '../api';
import type { AgentLifecycleInput } from '../types';

type LifecycleAction = 'start' | 'stop' | 'restart';

interface LifecycleVariables extends AgentLifecycleInput {
  action: LifecycleAction;
}

interface LifecycleSnapshot {
  previousAgents?: Agent[];
}

const OPTIMISTIC_STATUS: Record<LifecycleAction, AgentStatus> = {
  restart: 'running',
  start: 'running',
  stop: 'stopped',
};

const runLifecycle = ({ action, projectId, agentId }: LifecycleVariables) => {
  if (action === 'start') {
    return startAgent(projectId, agentId);
  }

  if (action === 'stop') {
    return stopAgent(projectId, agentId);
  }

  return restartAgent(projectId, agentId);
};

export const useAgentLifecycle = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: runLifecycle,
    onMutate: async (variables): Promise<LifecycleSnapshot> => {
      const queryKey = agentKeys.list(variables.projectId);
      await queryClient.cancelQueries({ queryKey });
      const previousAgents = queryClient.getQueryData<Agent[]>(queryKey);

      queryClient.setQueryData<Agent[]>(queryKey, (current) =>
        current?.map((agent) =>
          agent.id === variables.agentId
            ? { ...agent, status: OPTIMISTIC_STATUS[variables.action] }
            : agent,
        ),
      );

      return { previousAgents };
    },
    onError: (_error, variables, context) => {
      if (context?.previousAgents) {
        queryClient.setQueryData(agentKeys.list(variables.projectId), context.previousAgents);
      }
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.list(variables.projectId) });
      void queryClient.invalidateQueries({ queryKey: agentKeys.previews(variables.projectId) });
    },
  });

  return {
    restart: (input: AgentLifecycleInput) => mutation.mutate({ ...input, action: 'restart' }),
    start: (input: AgentLifecycleInput) => mutation.mutate({ ...input, action: 'start' }),
    stop: (input: AgentLifecycleInput) => mutation.mutate({ ...input, action: 'stop' }),
    ...mutation,
  };
};
