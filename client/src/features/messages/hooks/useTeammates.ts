import { useQuery } from '@tanstack/react-query';

import { getAgentTeammates, messageKeys } from '../api';

export const useTeammates = (projectId: string | null, agentId: string | null) =>
  useQuery({
    enabled: Boolean(projectId && agentId),
    queryFn: () => getAgentTeammates(projectId as string, agentId as string),
    queryKey: messageKeys.teammates(projectId, agentId),
  });

