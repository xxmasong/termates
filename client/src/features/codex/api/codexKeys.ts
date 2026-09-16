import { QUERY_KEY_ROOTS } from '@/constants';

export const codexKeys = {
  all: [QUERY_KEY_ROOTS.CODEX_MODELS] as const,
  models: () => [...codexKeys.all, 'models'] as const,
};
