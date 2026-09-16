import { QUERY_KEY_ROOTS } from '@/constants';

export const contentKeys = {
  all: [QUERY_KEY_ROOTS.CONTENT] as const,
  detail: (projectId: string | null, filename: string | null) =>
    [...contentKeys.project(projectId), 'detail', filename] as const,
  list: (projectId: string | null) => [...contentKeys.project(projectId), 'list'] as const,
  project: (projectId: string | null) => [...contentKeys.all, projectId] as const,
};

