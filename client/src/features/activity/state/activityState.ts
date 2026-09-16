import { atom } from 'recoil';

import type { ActivityEvent } from '@/types';

export const liveActivityState = atom<ActivityEvent[]>({
  default: [],
  key: 'activity.liveEvents',
});

