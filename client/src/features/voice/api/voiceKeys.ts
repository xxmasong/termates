import { QUERY_KEY_ROOTS } from '@/constants';

export const voiceKeys = {
  config: () => [QUERY_KEY_ROOTS.VOICE_CONFIG] as const,
  usage: () => [QUERY_KEY_ROOTS.USAGE] as const,
};

