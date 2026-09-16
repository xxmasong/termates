import { useMutation } from '@tanstack/react-query';

import { broadcastMessage, sendAgentMessage } from '../api';
import type { BroadcastMessageInput, SendAgentMessageInput } from '../types';

export const useSendAgentMessage = () =>
  useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: SendAgentMessageInput }) =>
      sendAgentMessage(projectId, input),
  });

export const useBroadcastMessage = () =>
  useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: BroadcastMessageInput }) =>
      broadcastMessage(projectId, input),
  });

