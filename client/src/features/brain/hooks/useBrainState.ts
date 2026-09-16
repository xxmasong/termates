import { useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRecoilState } from 'recoil';

import { WS_CLIENT_MESSAGE_TYPES } from '@/constants';
import { useWsSend, useWsSubscribe } from '@/lib/ws';
import type { BrainEvent, BrainState } from '@/types';

import { brainKeys, getBrainState } from '../api';
import { brainStateAtom } from '../state';

const applyBrainEvent = (current: BrainState, event: BrainEvent): BrainState => {
  if (event.kind === 'state') {
    return event.state;
  }

  if (event.kind === 'status') {
    return { ...current, status: event.status };
  }

  if (event.conversationId !== current.currentId) {
    return current;
  }

  if (current.messages.some((message) => message.id === event.message.id)) {
    return current;
  }

  return { ...current, messages: [...current.messages, event.message] };
};

export const useBrainState = () => {
  const [brainState, setBrainState] = useRecoilState(brainStateAtom);
  const query = useQuery({
    queryFn: getBrainState,
    queryKey: brainKeys.state(),
  });

  useEffect(() => {
    if (query.data) {
      setBrainState(query.data);
    }
  }, [query.data, setBrainState]);

  useWsSubscribe('brain:event', (message) => {
    setBrainState((current) => applyBrainEvent(current, message.payload));
  });

  return {
    brainState,
    error: query.error,
    loading: query.isLoading,
  };
};

export const useBrainActions = () => {
  const send = useWsSend();

  const sendMessage = useCallback(
    (message: string) => {
      send({ message, type: WS_CLIENT_MESSAGE_TYPES.BRAIN_SEND });
    },
    [send],
  );

  const startNew = useCallback(() => {
    send({ type: WS_CLIENT_MESSAGE_TYPES.BRAIN_NEW });
  }, [send]);

  const abort = useCallback(() => {
    send({ type: WS_CLIENT_MESSAGE_TYPES.BRAIN_ABORT });
  }, [send]);

  const switchConversation = useCallback(
    (conversationId: string) => {
      send({ conversationId, type: WS_CLIENT_MESSAGE_TYPES.BRAIN_SWITCH });
    },
    [send],
  );

  const deleteConversation = useCallback(
    (conversationId: string) => {
      send({ conversationId, type: WS_CLIENT_MESSAGE_TYPES.BRAIN_DELETE });
    },
    [send],
  );

  return { abort, deleteConversation, sendMessage, startNew, switchConversation };
};
