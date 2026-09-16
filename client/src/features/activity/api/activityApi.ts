import type { ActivityEvent } from '@/types';

import { apiRequest } from '@/lib/api';

export const getActivityHistory = (): Promise<ActivityEvent[]> =>
  apiRequest<ActivityEvent[]>('/activity');

