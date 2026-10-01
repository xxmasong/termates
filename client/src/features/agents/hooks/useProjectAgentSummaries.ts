import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { Project } from '@/types';

import { agentKeys, fetchProjectAgentSummaries, type ProjectAgentSummaries } from '../api';

const EMPTY: ProjectAgentSummaries = {};

/** Alive/total agent counts per project for the sidebar — one request for all projects. */
export const useProjectAgentSummaries = (projects: Project[]): ProjectAgentSummaries => {
  const projectIds = useMemo(() => projects.map((project) => project.id), [projects]);
  const query = useQuery({
    enabled: projectIds.length > 0,
    queryFn: () => fetchProjectAgentSummaries(projectIds),
    queryKey: [...agentKeys.summaries(), projectIds.join(',')],
  });
  return query.data ?? EMPTY;
};
