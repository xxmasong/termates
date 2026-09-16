import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

import type { WSClientMessage, WSServerMessage } from '@/types';

import { webSocketClient, type WebSocketStatus } from './wsClient';

type MessageType = WSServerMessage['type'];

export const useWsSend = (): ((message: WSClientMessage) => void) =>
  useCallback((message: WSClientMessage) => webSocketClient.send(message), []);

export const useWsSubscribe = <TType extends MessageType>(
  type: TType,
  handler: (message: Extract<WSServerMessage, { type: TType }>) => void,
  enabled = true,
): void => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    return webSocketClient.subscribe(type, (message) => handlerRef.current(message));
  }, [enabled, type]);
};

export const useWsStatus = (): WebSocketStatus =>
  useSyncExternalStore(
    (listener) => webSocketClient.subscribeStatus(listener),
    () => webSocketClient.getStatus(),
    () => 'idle',
  );
