import { QUERY_KEY_ROOTS } from '@/constants';

export const projectKeys = {
  all: [QUERY_KEY_ROOTS.PROJECTS] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: () => [...projectKeys.lists()] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (projectId: string) => [...projectKeys.details(), projectId] as const,
};
