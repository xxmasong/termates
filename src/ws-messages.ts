/**
 * ws-messages.ts — validate browser → web server WebSocket frames.
 *
 * Frames come straight from the browser, so nothing about their shape can be
 * trusted: a `null` frame used to throw inside the 'message' listener and take
 * the web server down. Anything malformed is dropped.
 */

import type { WSClientMessage } from './types.js';

/** Terminal sizes are clamped to what a screen can show; node-pty throws on NaN or ≤ 0. */
export const MAX_TERMINAL_DIMENSION = 1000;
const MAX_ID_LENGTH = 128;

type Raw = Record<string, unknown>;

const isId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= MAX_ID_LENGTH;

const dimension = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(MAX_TERMINAL_DIMENSION, Math.max(1, Math.floor(value)))
    : null;

const withSize = (raw: Raw): { cols: number; rows: number } | null => {
  const cols = dimension(raw.cols);
  const rows = dimension(raw.rows);
  return cols === null || rows === null ? null : { cols, rows };
};

function parse(raw: Raw): WSClientMessage | null {
  switch (raw.type) {
    case 'terminal:attach':
    case 'terminal:detach':
      return isId(raw.agentId) ? { type: raw.type, agentId: raw.agentId } : null;
    case 'terminal:input':
      return isId(raw.agentId) && typeof raw.data === 'string'
        ? { type: raw.type, agentId: raw.agentId, data: raw.data }
        : null;
    case 'terminal:resize': {
      const size = withSize(raw);
      return isId(raw.agentId) && size ? { type: raw.type, agentId: raw.agentId, ...size } : null;
    }
    case 'brain:send':
      return typeof raw.message === 'string' ? { type: raw.type, message: raw.message } : null;
    case 'brain:new':
    case 'brain:abort':
    case 'login:stop':
      return { type: raw.type };
    case 'brain:switch':
    case 'brain:delete':
      return isId(raw.conversationId) ? { type: raw.type, conversationId: raw.conversationId } : null;
    case 'login:start': {
      const size = withSize(raw);
      return typeof raw.cli === 'string' && size ? { type: raw.type, cli: raw.cli, ...size } : null;
    }
    case 'login:input':
      return typeof raw.data === 'string' ? { type: raw.type, data: raw.data } : null;
    case 'login:resize': {
      const size = withSize(raw);
      return size ? { type: raw.type, ...size } : null;
    }
    default:
      return null;
  }
}

/** The frame as a known client message, or null when it is anything else. */
export function parseClientMessage(text: string): WSClientMessage | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  return raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? parse(raw as Raw) : null;
}
