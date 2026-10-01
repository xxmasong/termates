import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { QUERY_KEY_ROOTS } from '@/constants';
import { agentKeys } from '@/features/agents';
import { projectKeys } from '@/features/projects';
import { graphql, useGraphQLSubscription } from '@/lib/graphql';
import type { Agent } from '@/types';

const AgentStatusSubscription = graphql(`
  subscription LiveAgentStatus {
    agentStatus {
      agentId
    }
  }
`);

const ContentUpdatedSubscription = graphql(`
  subscription LiveContentUpdated {
    contentUpdated {
      projectId
    }
  }
`);

const OrgChangedSubscription = graphql(`
  subscription LiveOrgChanged {
    orgChanged
  }
`);

interface LiveQueryInvalidationProps {
  children?: never;
}

const hasAgentId = (value: unknown, agentId: string): value is Agent[] =>
  Array.isArray(value) &&
  value.some(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'id' in item &&
      (item as { id: unknown }).id === agentId,
  );

const queryKeyContains = (queryKey: readonly unknown[], value: string): boolean =>
  queryKey.some((part) => part === value);

/** Server events (GraphQL subscriptions over SSE) → TanStack Query invalidation. */
export const LiveQueryInvalidation: React.FC<LiveQueryInvalidationProps> = () => {
  const queryClient = useQueryClient();

  const invalidateAgentStatus = useCallback(
    (agentId: string) => {
      const listQueries = queryClient.getQueryCache().findAll({ queryKey: agentKeys.lists() });
      const matchingQueries = listQueries.filter((query) => hasAgentId(query.state.data, agentId));

      // The sidebar's per-project counts aren't Agent[] lists, refresh them too.
      void queryClient.invalidateQueries({ queryKey: agentKeys.summaries() });

      if (matchingQueries.length === 0) {
        void queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
        return;
      }

      matchingQueries.forEach((query) => {
        void queryClient.invalidateQueries({ queryKey: query.queryKey });
      });
    },
    [queryClient],
  );

  const invalidateProjectContent = useCallback(
    (projectId: string) => {
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === QUERY_KEY_ROOTS.CONTENT &&
          queryKeyContains(query.queryKey, projectId),
      });
    },
    [queryClient],
  );

  const invalidateOrganization = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: agentKeys.all });
  }, [queryClient]);

  useGraphQLSubscription(AgentStatusSubscription, (data) =>
    invalidateAgentStatus(data.agentStatus.agentId),
  );
  useGraphQLSubscription(ContentUpdatedSubscription, (data) =>
    invalidateProjectContent(data.contentUpdated.projectId),
  );
  useGraphQLSubscription(OrgChangedSubscription, invalidateOrganization);

  return null;
};
