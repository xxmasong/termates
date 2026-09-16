import { atomFamily } from 'recoil';

import type { ActivityEvent } from '@/types';

export const messageActivityState = atomFamily<ActivityEvent[], string>({
  default: [],
  key: 'messages.activityByProject',
});

