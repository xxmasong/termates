import { useQuery } from '@tanstack/react-query';

import { agentKeys, listAgents } from '../api';
import { NO_PROJECT_QUERY_KEY_PART } from '../constants';

export const useAgents = (projectId: string | null) =>
  useQuery({
    enabled: Boolean(projectId),
    queryFn: () => listAgents(projectId ?? ''),
    queryKey: projectId ? agentKeys.list(projectId) : agentKeys.list(NO_PROJECT_QUERY_KEY_PART),
  });
