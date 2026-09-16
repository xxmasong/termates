import { useMutation, useQueryClient } from '@tanstack/react-query';

import { broadcastMessage, messageKeys, sendAgentMessage } from '../api';
import type { BroadcastMessageInput, SendAgentMessageInput } from '../types';

export const useSendAgentMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: SendAgentMessageInput }) =>
      sendAgentMessage(projectId, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: messageKeys.project(variables.projectId) });
    },
  });
};

export const useBroadcastMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: BroadcastMessageInput }) =>
      broadcastMessage(projectId, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: messageKeys.project(variables.projectId) });
    },
  });
};
