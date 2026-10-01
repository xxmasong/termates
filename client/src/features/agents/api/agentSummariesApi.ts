import { ApiError } from '@/lib/api';
import { gqlRequest, graphql } from '@/lib/graphql';

import type { ProjectAgentSummary } from '../types';
import { listAgents } from './agentsApi';

const NOT_FOUND = 404;

const ProjectAgentSummariesQuery = graphql(`
  query ProjectAgentSummaries {
    projects {
      id
      agents {
        status
      }
    }
  }
`);

export type ProjectAgentSummaries = Record<string, ProjectAgentSummary>;

const summarize = (statuses: string[]): ProjectAgentSummary => ({
  alive: statuses.filter((status) => status.toLowerCase() !== 'stopped').length,
  total: statuses.length,
});

/**
 * Agent counts for every project in one GraphQL round-trip. Workspaces still
 * running a build without /graphql fall back to one REST call per project.
 */
export const fetchProjectAgentSummaries = async (
  projectIds: string[],
): Promise<ProjectAgentSummaries> => {
  try {
    const { projects } = await gqlRequest(ProjectAgentSummariesQuery);
    return Object.fromEntries(
      projects.map((project) => [project.id, summarize(project.agents.map((a) => a.status))]),
    );
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== NOT_FOUND) throw err;
    const lists = await Promise.all(projectIds.map((id) => listAgents(id)));
    return Object.fromEntries(
      projectIds.map((id, index) => [id, summarize(lists[index].map((a) => a.status))]),
    );
  }
};
