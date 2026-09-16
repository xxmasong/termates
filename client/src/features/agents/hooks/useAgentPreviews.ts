import { useQuery } from '@tanstack/react-query';

import { agentKeys, getAgentPreviews } from '../api';
import { NO_PROJECT_QUERY_KEY_PART } from '../constants';

export const useAgentPreviews = (projectId: string | null) =>
  useQuery({
    enabled: Boolean(projectId),
    queryFn: () => getAgentPreviews(projectId ?? ''),
    queryKey: projectId
      ? agentKeys.previews(projectId)
      : agentKeys.previews(NO_PROJECT_QUERY_KEY_PART),
  });
