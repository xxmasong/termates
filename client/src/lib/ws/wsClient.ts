import { WS_CLIENT_MESSAGE_TYPES, WS_PATH, WS_RECONNECT } from '@/constants';
import type { WSClientMessage, WSServerMessage } from '@/types';

type MessageType = WSServerMessage['type'];
type MessageListener<TType extends MessageType = MessageType> = (
  message: Extract<WSServerMessage, { type: TType }>,
) => void;
type StatusListener = (status: WebSocketStatus) => void;

export type WebSocketStatus = 'idle' | 'connecting' | 'open' | 'closed';

interface Subscription<TType extends MessageType = MessageType> {
  type?: TType;
  listener: (message: WSServerMessage) => void;
}

const getWebSocketUrl = (): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${WS_PATH}`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

class WebSocketClient {
  private socket: WebSocket | null = null;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private reconnectAttempt = 0;

  private status: WebSocketStatus = 'idle';

  private manuallyClosed = false;

  private queue: WSClientMessage[] = [];

  private subscriptions = new Set<Subscription>();

  private statusListeners = new Set<StatusListener>();

  private terminalAttachCounts = new Map<string, number>();

  connect(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    this.manuallyClosed = false;
    this.clearReconnectTimer();
    this.setStatus('connecting');

    const socket = new WebSocket(getWebSocketUrl());
    this.socket = socket;

    socket.addEventListener('open', () => {
      if (this.socket !== socket) {
        return;
      }

      this.reconnectAttempt = 0;
      this.setStatus('open');
      this.replayTerminalAttachments();
      this.flushQueue();
    });

    socket.addEventListener('message', (event) => this.handleMessage(event));
    socket.addEventListener('error', () => socket.close());
    socket.addEventListener('close', () => {
      if (this.socket === socket) {
        this.socket = null;
      }

      this.setStatus('closed');

      if (!this.manuallyClosed) {
        this.scheduleReconnect();
      }
    });
  }

  disconnect(): void {
    this.manuallyClosed = true;
    this.clearReconnectTimer();
    this.socket?.close();
    this.socket = null;
    this.setStatus('closed');
  }

  send(message: WSClientMessage): void {
    if (this.handleTerminalAttachmentMessage(message)) {
      return;
    }

    if (this.isOpen()) {
      this.socket?.send(JSON.stringify(message));
      return;
    }

    this.queue.push(message);
    this.connect();
  }

  subscribe<TType extends MessageType>(
    type: TType,
    listener: MessageListener<TType>,
  ): () => void {
    const subscription: Subscription = {
      listener: (message) => listener(message as Extract<WSServerMessage, { type: TType }>),
      type,
    };
    this.subscriptions.add(subscription);
    this.connect();

    return () => {
      this.subscriptions.delete(subscription);
    };
  }

  subscribeAll(listener: (message: WSServerMessage) => void): () => void {
    const subscription: Subscription = { listener };
    this.subscriptions.add(subscription);
    this.connect();

    return () => {
      this.subscriptions.delete(subscription);
    };
  }

  subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);

    return () => {
      this.statusListeners.delete(listener);
    };
  }

  getStatus(): WebSocketStatus {
    return this.status;
  }

  private handleMessage(event: MessageEvent<string>): void {
    let parsed: unknown;

    try {
      parsed = JSON.parse(event.data);
    } catch {
      return;
    }

    if (!isRecord(parsed) || typeof parsed.type !== 'string') {
      return;
    }

    const message = parsed as WSServerMessage;

    this.subscriptions.forEach((subscription) => {
      if (!subscription.type || subscription.type === message.type) {
        subscription.listener(message as never);
      }
    });
  }

  private handleTerminalAttachmentMessage(message: WSClientMessage): boolean {
    if (message.type === WS_CLIENT_MESSAGE_TYPES.TERMINAL_ATTACH) {
      const count = this.terminalAttachCounts.get(message.agentId) ?? 0;
      this.terminalAttachCounts.set(message.agentId, count + 1);

      if (count === 0 && this.isOpen()) {
        this.socket?.send(JSON.stringify(message));
      } else {
        this.connect();
      }

      return true;
    }

    if (message.type === WS_CLIENT_MESSAGE_TYPES.TERMINAL_DETACH) {
      const count = this.terminalAttachCounts.get(message.agentId) ?? 0;
      const nextCount = Math.max(0, count - 1);

      if (nextCount === 0) {
        this.terminalAttachCounts.delete(message.agentId);
        this.dropQueuedTerminalMessages(message.agentId);

        if (count > 0 && this.isOpen()) {
          this.socket?.send(JSON.stringify(message));
        }
      } else {
        this.terminalAttachCounts.set(message.agentId, nextCount);
      }

      return true;
    }

    return false;
  }

  private replayTerminalAttachments(): void {
    this.terminalAttachCounts.forEach((_count, agentId) => {
      this.socket?.send(
        JSON.stringify({
          agentId,
          type: WS_CLIENT_MESSAGE_TYPES.TERMINAL_ATTACH,
        } satisfies WSClientMessage),
      );
    });
  }

  private dropQueuedTerminalMessages(agentId: string): void {
    this.queue = this.queue.filter((message) => {
      if (
        message.type === WS_CLIENT_MESSAGE_TYPES.TERMINAL_INPUT ||
        message.type === WS_CLIENT_MESSAGE_TYPES.TERMINAL_RESIZE
      ) {
        return message.agentId !== agentId;
      }

      return true;
    });
  }

  private flushQueue(): void {
    if (!this.isOpen()) {
      return;
    }

    const pending = this.queue;
    this.queue = [];
    pending.forEach((message) => this.socket?.send(JSON.stringify(message)));
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    const exponentialDelay = Math.min(
      WS_RECONNECT.MAX_DELAY_MS,
      WS_RECONNECT.BASE_DELAY_MS * 2 ** this.reconnectAttempt,
    );
    const jitter = Math.floor(Math.random() * WS_RECONNECT.JITTER_MS);
    this.reconnectAttempt += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, exponentialDelay + jitter);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  private setStatus(status: WebSocketStatus): void {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }
}

// Module singleton: all hooks and providers share this manager, so the app only
// ever opens one browser WebSocket connection to `/ws`.
export const webSocketClient = new WebSocketClient();
