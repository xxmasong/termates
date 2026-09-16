import { QUERY_KEY_ROOTS } from '@/constants';

export const brainKeys = {
  all: [QUERY_KEY_ROOTS.BRAIN] as const,
  state: () => [...brainKeys.all, 'state'] as const,
};
