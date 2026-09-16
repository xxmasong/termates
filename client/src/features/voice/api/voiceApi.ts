import { API_BASE_URL } from '@/constants';
import { ApiError, apiRequest } from '@/lib/api';

import type { TextToSpeechInput, UsageSummary, VoiceConfig } from '../types';

export const getVoiceConfig = (): Promise<VoiceConfig> => apiRequest<VoiceConfig>('/voice/config');

export const updateVoiceConfig = (input: VoiceConfig): Promise<VoiceConfig> =>
  apiRequest<VoiceConfig, VoiceConfig>('/voice/config', {
    body: input,
    method: 'PUT',
  });

export const getUsage = (): Promise<UsageSummary> => apiRequest<UsageSummary>('/usage');

export const textToSpeech = async (input: TextToSpeechInput): Promise<Blob> => {
  const response = await fetch(`${API_BASE_URL}/voice/tts`, {
    body: JSON.stringify(input),
    headers: {
      Accept: 'audio/*,application/json',
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    let body: unknown;
    try {
      body = await response.json();
      if (
        typeof body === 'object' &&
        body !== null &&
        'error' in body &&
        typeof (body as { error: unknown }).error === 'string'
      ) {
        message = (body as { error: string }).error;
      }
    } catch {
      body = undefined;
    }
    throw new ApiError(message, response.status, body);
  }

  return response.blob();
};

