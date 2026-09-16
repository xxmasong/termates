import { apiRequest } from '@/lib/api';
import type { Agent } from '@/types';

import type { AgentLifecycleResult, CreateAgentInput, UpdateAgentInput } from '../types';

export const listAgents = (projectId: string): Promise<Agent[]> =>
  apiRequest<Agent[]>(`/projects/${projectId}/agents`);

export const getAgentPreviews = (projectId: string): Promise<Record<string, string>> =>
  apiRequest<Record<string, string>>(`/projects/${projectId}/agents/previews`);

export const createAgent = (projectId: string, input: CreateAgentInput): Promise<Agent> =>
  apiRequest<Agent, CreateAgentInput>(`/projects/${projectId}/agents`, {
    body: input,
    method: 'POST',
  });

export const updateAgent = (
  projectId: string,
  agentId: string,
  input: UpdateAgentInput,
): Promise<Agent> =>
  apiRequest<Agent, UpdateAgentInput>(`/projects/${projectId}/agents/${agentId}`, {
    body: input,
    method: 'PUT',
  });

export const deleteAgent = async (projectId: string, agentId: string): Promise<void> => {
  await apiRequest<undefined>(`/projects/${projectId}/agents/${agentId}`, {
    method: 'DELETE',
  });
};

export const startAgent = (projectId: string, agentId: string): Promise<AgentLifecycleResult> =>
  apiRequest<AgentLifecycleResult>(`/projects/${projectId}/agents/${agentId}/start`, {
    method: 'POST',
  });

export const stopAgent = (projectId: string, agentId: string): Promise<AgentLifecycleResult> =>
  apiRequest<AgentLifecycleResult>(`/projects/${projectId}/agents/${agentId}/stop`, {
    method: 'POST',
  });

export const restartAgent = (projectId: string, agentId: string): Promise<AgentLifecycleResult> =>
  apiRequest<AgentLifecycleResult>(`/projects/${projectId}/agents/${agentId}/restart`, {
    method: 'POST',
  });
