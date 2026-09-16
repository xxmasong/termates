import type { Agent } from '@/types';

import { apiRequest } from '@/lib/api';

import type { BroadcastMessageInput, SendAgentMessageInput } from '../types';

export const sendAgentMessage = (
  projectId: string,
  input: SendAgentMessageInput,
): Promise<undefined> =>
  apiRequest<undefined, SendAgentMessageInput>(`/projects/${projectId}/messages`, {
    body: input,
    method: 'POST',
  });

export const broadcastMessage = (
  projectId: string,
  input: BroadcastMessageInput,
): Promise<undefined> =>
  apiRequest<undefined, BroadcastMessageInput>(`/projects/${projectId}/broadcast`, {
    body: input,
    method: 'POST',
  });

export const getAgentTeammates = (projectId: string, agentId: string): Promise<Agent[]> =>
  apiRequest<Agent[]>(`/projects/${projectId}/agents/${agentId}/teammates`);
