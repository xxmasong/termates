import type { AgentCli } from './types';
import type { IconName } from '@/components';

export const AGENT_CLI_OPTIONS: Array<{ value: AgentCli; label: string; icon: IconName }> = [
  { icon: 'terminal', label: 'Claude', value: 'claude' },
  { icon: 'sparkles', label: 'Codex', value: 'codex' },
  { icon: 'bolt', label: 'Gemini', value: 'gemini' },
  { icon: 'terminal', label: 'OpenCode', value: 'opencode' },
];

export const AGENT_FORM_FIELD_IDS = {
  CWD: 'agent-cwd',
  NAME: 'agent-name',
  ROLE: 'agent-role',
} as const;

export const AGENT_STATUS_LABELS = {
  awaiting_input: 'Awaiting input',
  idle: 'Idle',
  running: 'Running',
  stopped: 'Stopped',
} as const;

export const NO_PROJECT_QUERY_KEY_PART = '__no-project__';
