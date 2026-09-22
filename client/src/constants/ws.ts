export const WS_CLIENT_MESSAGE_TYPES = {
  BRAIN_ABORT: 'brain:abort',
  BRAIN_DELETE: 'brain:delete',
  BRAIN_NEW: 'brain:new',
  BRAIN_SEND: 'brain:send',
  BRAIN_SWITCH: 'brain:switch',
  TERMINAL_ATTACH: 'terminal:attach',
  TERMINAL_DETACH: 'terminal:detach',
  TERMINAL_INPUT: 'terminal:input',
  TERMINAL_RESIZE: 'terminal:resize',
} as const;

export const WS_SERVER_MESSAGE_TYPES = {
  ACTIVITY: 'activity',
  AGENT_STATUS: 'agent:status',
  BRAIN_EVENT: 'brain:event',
  CODEX_ITEM: 'codex:item',
  CONTENT_UPDATED: 'content:updated',
  ORG_CHANGED: 'org:changed',
  TERMINAL_OUTPUT: 'terminal:output',
} as const;

export const WS_RECONNECT = {
  BASE_DELAY_MS: 500,
  MAX_DELAY_MS: 30_000,
  JITTER_MS: 350,
} as const;

export const WS_PATH = '/ws';
