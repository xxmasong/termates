import { QUERY_KEY_ROOTS } from '@/constants';

export const activityKeys = {
  all: [QUERY_KEY_ROOTS.ACTIVITY] as const,
  history: () => [...activityKeys.all, 'history'] as const,
};

