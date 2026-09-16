import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getUsage, getVoiceConfig, textToSpeech, updateVoiceConfig, voiceKeys } from '../api';
import type { TextToSpeechInput, VoiceConfig } from '../types';

export const useVoiceConfig = () =>
  useQuery({
    queryFn: getVoiceConfig,
    queryKey: voiceKeys.config(),
  });

export const useUpdateVoiceConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: VoiceConfig) => updateVoiceConfig(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: voiceKeys.config() });
    },
  });
};

export const useTextToSpeech = () =>
  useMutation({
    mutationFn: (input: TextToSpeechInput) => textToSpeech(input),
  });

export const useUsage = () =>
  useQuery({
    queryFn: getUsage,
    queryKey: voiceKeys.usage(),
  });

