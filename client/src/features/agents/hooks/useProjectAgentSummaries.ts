import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';

import type { Agent, Project } from '@/types';

import { agentKeys, listAgents } from '../api';
import type { ProjectAgentSummary } from '../types';

type ProjectAgentSummaries = Record<string, ProjectAgentSummary>;

const summarizeAgents = (agents: Agent[] | undefined): ProjectAgentSummary => {
  const list = agents ?? [];

  return {
    alive: list.filter((agent) => agent.status !== 'stopped').length,
    total: list.length,
  };
};

export const useProjectAgentSummaries = (projects: Project[]): ProjectAgentSummaries => {
  const queries = useQueries({
    queries: projects.map((project) => ({
      queryFn: () => listAgents(project.id),
      queryKey: agentKeys.list(project.id),
    })),
  });

  return useMemo(
    () =>
      projects.reduce<ProjectAgentSummaries>((summaries, project, index) => {
        summaries[project.id] = summarizeAgents(queries[index]?.data);
        return summaries;
      }, {}),
    [projects, queries],
  );
};
