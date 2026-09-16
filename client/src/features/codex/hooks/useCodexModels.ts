import { useQuery } from '@tanstack/react-query';

import { codexKeys, getCodexModels } from '../api';

export const useCodexModels = () =>
  useQuery({
    queryFn: getCodexModels,
    queryKey: codexKeys.models(),
    select: (data) => data.models,
  });
