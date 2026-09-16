import { QUERY_KEY_ROOTS } from '@/constants';

export const messageKeys = {
  all: [QUERY_KEY_ROOTS.ACTIVITY, 'messages'] as const,
  project: (projectId: string | null) => [...messageKeys.all, projectId] as const,
  teammates: (projectId: string | null, agentId: string | null) =>
    [QUERY_KEY_ROOTS.AGENTS, projectId, 'teammates', agentId] as const,
};

