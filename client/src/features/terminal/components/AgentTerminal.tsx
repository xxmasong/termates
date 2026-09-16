import { FitAddon } from '@xterm/addon-fit';
import { Terminal as XTerminal, type ITheme } from '@xterm/xterm';
import { useCallback, useEffect, useRef } from 'react';
import '@xterm/xterm/css/xterm.css';

import { WS_CLIENT_MESSAGE_TYPES } from '@/constants';
import { useWsSend, useWsSubscribe } from '@/lib/ws';

import {
  TERMINAL_INITIAL_LOAD_MS,
  TERMINAL_INITIAL_SCROLL_IDLE_MS,
  TERMINAL_RESIZE_DEBOUNCE_MS,
} from '../constants';

const DARK_TERMINAL_THEME: ITheme = {
  background: '#1e1e1e',
  black: '#1e1e1e',
  blue: '#529cca',
  brightBlack: '#6e7681',
  brightBlue: '#79c0ff',
  brightCyan: '#76d9e6',
  brightGreen: '#6bc49a',
  brightMagenta: '#d2a8ff',
  brightRed: '#f47067',
  brightWhite: '#e6edf3',
  brightYellow: '#f0d96d',
  cursor: '#529cca',
  cyan: '#56b6c2',
  foreground: '#e6edf3',
  green: '#4dab9a',
  magenta: '#c678dd',
  red: '#eb5757',
  selectionBackground: 'rgba(82, 156, 202, 0.3)',
  white: '#d4d4d4',
  yellow: '#e6c845',
};

const LIGHT_TERMINAL_THEME: ITheme = {
  background: '#f7f7f5',
  black: '#37352f',
  blue: '#2383e2',
  brightBlack: '#8b8680',
  brightBlue: '#529cca',
  brightCyan: '#3aafa9',
  brightGreen: '#4dab9a',
  brightMagenta: '#b44dd7',
  brightRed: '#d77b53',
  brightWhite: '#f7f7f5',
  brightYellow: '#c49a1a',
  cursor: '#2383e2',
  cyan: '#0e7a7a',
  foreground: '#37352f',
  green: '#2c7a39',
  magenta: '#8700af',
  red: '#c0392b',
  selectionBackground: 'rgba(0, 153, 153, 0.2)',
  white: '#e0ddd8',
  yellow: '#966c1e',
};

const getTerminalTheme = (): ITheme =>
  document.documentElement.getAttribute('data-theme') === 'light'
    ? LIGHT_TERMINAL_THEME
    : DARK_TERMINAL_THEME;

export interface AgentTerminalProps {
  agentId: string;
  focused?: boolean;
  visible?: boolean;
  onFocus?: () => void;
}

export const AgentTerminal: React.FC<AgentTerminalProps> = ({
  agentId,
  focused = false,
  visible = true,
  onFocus,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const initialLoadRef = useRef(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const send = useWsSend();

  const emitResize = useCallback(() => {
    const terminal = terminalRef.current;

    if (!terminal || !visible) {
      return;
    }

    send({
      agentId,
      cols: terminal.cols,
      rows: terminal.rows,
      type: WS_CLIENT_MESSAGE_TYPES.TERMINAL_RESIZE,
    });
  }, [agentId, send, visible]);

  const scheduleFit = useCallback(() => {
    if (resizeTimerRef.current) {
      clearTimeout(resizeTimerRef.current);
    }

    resizeTimerRef.current = setTimeout(() => {
      fitRef.current?.fit();
      emitResize();
    }, TERMINAL_RESIZE_DEBOUNCE_MS);
  }, [emitResize]);

  useEffect(() => {
    if (focused && visible) {
      terminalRef.current?.focus();
    }
  }, [focused, visible]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !visible) {
      return undefined;
    }

    const terminal = new XTerminal({
      cursorBlink: true,
      fontFamily: "'Consolas', 'Fira Code', monospace",
      fontSize: 12.25,
      theme: getTerminalTheme(),
    });
    const fit = new FitAddon();

    terminal.loadAddon(fit);
    terminal.open(container);
    fit.fit();

    terminalRef.current = terminal;
    fitRef.current = fit;
    initialLoadRef.current = true;

    const themeObserver = new MutationObserver(() => {
      terminal.options.theme = getTerminalTheme();
    });
    themeObserver.observe(document.documentElement, {
      attributeFilter: ['data-theme'],
      attributes: true,
    });

    send({ agentId, type: WS_CLIENT_MESSAGE_TYPES.TERMINAL_ATTACH });
    emitResize();

    scrollTimerRef.current = setTimeout(() => {
      initialLoadRef.current = false;
    }, TERMINAL_INITIAL_LOAD_MS);

    const inputDisposable = terminal.onData((data) => {
      send({ agentId, data, type: WS_CLIENT_MESSAGE_TYPES.TERMINAL_INPUT });
    });

    const resizeDisposable = terminal.onResize(({ cols, rows }) => {
      send({ agentId, cols, rows, type: WS_CLIENT_MESSAGE_TYPES.TERMINAL_RESIZE });
    });

    terminal.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown') {
        return true;
      }

      const hasModifier = event.ctrlKey || event.metaKey;

      if (hasModifier && event.key === 'v') {
        return false;
      }

      if (hasModifier && event.key === 'c' && terminal.hasSelection()) {
        return false;
      }

      if (hasModifier && (event.key === 'k' || event.key === 'K' || event.key === '/')) {
        return false;
      }

      if (hasModifier && /^[1-9]$/.test(event.key)) {
        return false;
      }

      return true;
    });

    const focusIn = (): void => onFocus?.();
    const mouseDown = (): void => {
      onFocus?.();
      setTimeout(() => terminalRef.current?.focus(), 0);
    };
    const paste = (event: ClipboardEvent): void => {
      const text = event.clipboardData?.getData('text');

      if (text) {
        event.preventDefault();
        event.stopPropagation();
        terminal.paste(text);
      }
    };
    const resizeObserver = new ResizeObserver(scheduleFit);

    container.addEventListener('focusin', focusIn);
    container.addEventListener('mousedown', mouseDown);
    container.addEventListener('paste', paste);
    resizeObserver.observe(container);

    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }

      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
      }

      container.removeEventListener('focusin', focusIn);
      container.removeEventListener('mousedown', mouseDown);
      container.removeEventListener('paste', paste);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      inputDisposable.dispose();
      resizeDisposable.dispose();
      send({ agentId, type: WS_CLIENT_MESSAGE_TYPES.TERMINAL_DETACH });
      terminal.dispose();
      terminalRef.current = null;
      fitRef.current = null;
    };
  }, [agentId, emitResize, onFocus, scheduleFit, send, visible]);

  useWsSubscribe(
    'terminal:output',
    (message) => {
      if (message.agentId !== agentId) {
        return;
      }

      const terminal = terminalRef.current;

      if (!terminal) {
        return;
      }

      terminal.write(message.data);

      if (initialLoadRef.current) {
        if (scrollTimerRef.current) {
          clearTimeout(scrollTimerRef.current);
        }

        scrollTimerRef.current = setTimeout(() => {
          terminal.scrollToBottom();
          initialLoadRef.current = false;
        }, TERMINAL_INITIAL_SCROLL_IDLE_MS);
      }
    },
    visible,
  );

  return <div className="terminal-container" ref={containerRef} />;
};
