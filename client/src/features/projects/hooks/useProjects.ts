import { useQuery } from '@tanstack/react-query';

import { listProjects, projectKeys } from '../api';

export const useProjects = () =>
  useQuery({
    queryFn: listProjects,
    queryKey: projectKeys.list(),
  });
