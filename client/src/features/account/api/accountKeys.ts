import { QUERY_KEY_ROOTS } from '@/constants';

export const accountKeys = {
  all: [QUERY_KEY_ROOTS.ACCOUNT] as const,
  me: () => [...accountKeys.all, 'me'] as const,
};
