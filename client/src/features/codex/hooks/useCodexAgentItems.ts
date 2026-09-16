import { useCallback } from 'react';
import { useRecoilState } from 'recoil';

import { WS_CLIENT_MESSAGE_TYPES } from '@/constants';
import { useWsSend, useWsSubscribe } from '@/lib/ws';
import type { CodexItem } from '@/types';

import { codexItemsByAgentState } from '../state';

const upsertCodexItem = (items: CodexItem[], item: CodexItem): CodexItem[] => {
  const index = items.findIndex((current) => current.id === item.id);

  if (index === -1) {
    return [...items, item];
  }

  const next = items.slice();
  next[index] = item;
  return next;
};

export const useCodexAgentItems = (agentId: string, visible: boolean) => {
  const [items, setItems] = useRecoilState(codexItemsByAgentState(agentId));

  useWsSubscribe(
    'codex:item',
    (message) => {
      if (message.agentId === agentId) {
        setItems((current) => upsertCodexItem(current, message.item));
      }
    },
    visible,
  );

  const clearItems = useCallback(() => setItems([]), [setItems]);

  return { clearItems, items };
};

export const useCodexActions = (agentId: string) => {
  const send = useWsSend();

  const sendMessage = useCallback(
    (text: string, model?: string, effort?: string) => {
      send({
        agentId,
        effort: effort || undefined,
        model: model || undefined,
        text,
        type: WS_CLIENT_MESSAGE_TYPES.CODEX_SEND,
      });
    },
    [agentId, send],
  );

  const newThread = useCallback(() => {
    send({ agentId, type: WS_CLIENT_MESSAGE_TYPES.CODEX_NEW_THREAD });
  }, [agentId, send]);

  return { newThread, sendMessage };
};
