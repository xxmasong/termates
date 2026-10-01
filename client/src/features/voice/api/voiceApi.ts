import { apiRequest } from '@/lib/api';

import type { AuthSummary, UsageSummary, VoiceConfig } from '../types';

export const getVoiceConfig = (): Promise<VoiceConfig> => apiRequest<VoiceConfig>('/voice/config');

export const updateVoiceConfig = (input: VoiceConfig): Promise<VoiceConfig> =>
  apiRequest<VoiceConfig, VoiceConfig>('/voice/config', {
    body: input,
    method: 'PUT',
  });

export const getUsage = (): Promise<UsageSummary> => apiRequest<UsageSummary>('/usage');

export const getAuth = (): Promise<AuthSummary> => apiRequest<AuthSummary>('/auth');

export const logoutCli = (cli: string): Promise<{ ok: boolean; error?: string }> =>
  apiRequest<{ ok: boolean; error?: string }>(`/auth/${cli}/logout`, { method: 'POST' });
