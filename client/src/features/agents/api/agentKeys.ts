import { QUERY_KEY_ROOTS } from '@/constants';

export const agentKeys = {
  all: [QUERY_KEY_ROOTS.AGENTS] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (projectId: string) => [...agentKeys.lists(), projectId] as const,
  previews: (projectId: string) => [...agentKeys.all, 'previews', projectId] as const,
  details: () => [...agentKeys.all, 'detail'] as const,
  detail: (projectId: string, agentId: string) =>
    [...agentKeys.details(), projectId, agentId] as const,
};
