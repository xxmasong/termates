import type { ActivityEvent, AgentTeammatesResponse, Teammate } from '@/types';

import { apiRequest } from '@/lib/api';

import type {
  BroadcastMessageInput,
  BroadcastMessageResponse,
  SendAgentMessageInput,
  SendAgentMessageResponse,
} from '../types';

export const sendAgentMessage = (
  projectId: string,
  input: SendAgentMessageInput,
): Promise<SendAgentMessageResponse> =>
  apiRequest<SendAgentMessageResponse, SendAgentMessageInput>(`/projects/${projectId}/messages`, {
    body: input,
    method: 'POST',
  });

export const broadcastMessage = (
  projectId: string,
  input: BroadcastMessageInput,
): Promise<BroadcastMessageResponse> =>
  apiRequest<BroadcastMessageResponse, BroadcastMessageInput>(`/projects/${projectId}/broadcast`, {
    body: input,
    method: 'POST',
  });

export const getAgentTeammates = async (projectId: string, agentId: string): Promise<Teammate[]> => {
  const response = await apiRequest<AgentTeammatesResponse>(
    `/projects/${projectId}/agents/${agentId}/teammates`,
  );

  return response.teammates;
};

export const listProjectMessageActivity = (projectId: string): Promise<ActivityEvent[]> =>
  apiRequest<ActivityEvent[]>(`/activity?projectId=${encodeURIComponent(projectId)}`);
