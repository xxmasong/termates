import { useCallback, useMemo, useState } from 'react';

import { useSpeechInput, useVoiceConfig, useWakeWord } from '@/features/voice';
import { renderMarkdown } from '@/lib/utils';
import type { BrainMessage } from '@/types';

import { useBrainActions, useBrainState } from './useBrainState';

export interface KeeperHudNotice {
  agentId: string;
  agentName: string;
  projectId: string;
  projectName: string;
}

interface UseKeeperHudOptions {
  headerListening: boolean;
}

const DEFAULT_WAKE_WORD = 'Hey Queen';
const DEFAULT_WAKE_LANGUAGE = 'zh-TW';

const getLastAssistantMessage = (messages: BrainMessage[]): BrainMessage | null => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === 'assistant' || message.role === 'error') {
      return message;
    }
  }

  return null;
};

export const useKeeperHud = ({ headerListening }: UseKeeperHudOptions) => {
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [hiddenReplyId, setHiddenReplyId] = useState<string | null>(null);
  const { brainState } = useBrainState();
  const { abort, sendMessage } = useBrainActions();
  const voiceConfig = useVoiceConfig();
  const wakeEnabled = Boolean(voiceConfig.data?.wakeWordEnabled);
  const wakePhrase = voiceConfig.data?.wakeWord ?? DEFAULT_WAKE_WORD;
  const wakeLanguage = voiceConfig.data?.language ?? DEFAULT_WAKE_LANGUAGE;

  const submitText = useCallback(
    (text: string) => {
      const message = text.trim();

      if (!message || brainState.status === 'thinking') {
        return;
      }

      sendMessage(message);
      setInput('');
      setHiddenReplyId(null);
      setExpanded(true);
    },
    [brainState.status, sendMessage],
  );

  const speech = useSpeechInput(
    useCallback(
      (text: string, final: boolean) => {
        setInput(text);
        if (final) {
          submitText(text);
        }
      },
      [submitText],
    ),
  );

  const wake = useWakeWord({
    enabled: wakeEnabled,
    language: wakeLanguage,
    onCommand: submitText,
    onWake: () => setExpanded(true),
    phrase: wakePhrase,
  });

  const lastReply = useMemo(() => getLastAssistantMessage(brainState.messages), [brainState.messages]);
  const replyHtml = useMemo(
    () => (lastReply && lastReply.id !== hiddenReplyId ? renderMarkdown(lastReply.text) : ''),
    [hiddenReplyId, lastReply],
  );
  const state = brainState.status === 'thinking'
    ? 'thinking'
    : speech.listening || wake.armed || headerListening
      ? 'listening'
      : 'idle';

  const submit = useCallback(() => submitText(input), [input, submitText]);
  const clearReply = useCallback(() => setHiddenReplyId(lastReply?.id ?? null), [lastReply]);
  const toggleExpanded = useCallback(() => setExpanded((current) => !current), []);
  const close = useCallback(() => setExpanded(false), []);

  return {
    abort,
    clearReply,
    close,
    expanded,
    input,
    replyHtml,
    setInput,
    speech,
    state,
    status: brainState.status,
    submit,
    toggleExpanded,
    wake: {
      armed: wake.armed,
      enabled: wakeEnabled,
      phrase: wakePhrase,
      supported: wake.supported,
    },
  };
};
