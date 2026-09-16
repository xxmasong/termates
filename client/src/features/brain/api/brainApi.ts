import { apiRequest } from '@/lib/api';
import type { BrainState } from '@/types';

export const getBrainState = (): Promise<BrainState> => apiRequest<BrainState>('/brain');
