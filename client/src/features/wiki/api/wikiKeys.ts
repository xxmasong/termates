import { QUERY_KEY_ROOTS } from '@/constants';

export const wikiKeys = {
  all: [QUERY_KEY_ROOTS.WIKI] as const,
  detail: (projectId: string | null, filename: string | null) =>
    [...wikiKeys.project(projectId), 'detail', filename] as const,
  list: (projectId: string | null) => [...wikiKeys.project(projectId), 'list'] as const,
  project: (projectId: string | null) => [...wikiKeys.all, projectId] as const,
  status: (projectId: string | null) => [QUERY_KEY_ROOTS.WIKI_STATUS, projectId] as const,
};

