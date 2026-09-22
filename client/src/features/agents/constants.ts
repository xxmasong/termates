import type { AgentCli } from './types';
import type { IconName } from '@/components';

export const AGENT_CLI_OPTIONS: Array<{ value: AgentCli; label: string; icon: IconName }> = [
  { icon: 'terminal', label: 'Claude', value: 'claude' },
  { icon: 'sparkles', label: 'Codex', value: 'codex' },
  { icon: 'bolt', label: 'Gemini', value: 'gemini' },
];

/**
 * Model choices per CLI. These become launch flags, so changing one restarts
 * the agent. An empty value means "leave the CLI on its own default".
 */
export const AGENT_MODEL_OPTIONS: Record<AgentCli, string[]> = {
  claude: ['opus', 'sonnet', 'haiku'],
  codex: ['gpt-5.6-sol', 'gpt-5.6-codex', 'o3'],
  gemini: ['gemini-2.5-pro', 'gemini-2.5-flash'],
};

/** Reasoning effort per CLI. Gemini exposes no equivalent flag. */
export const AGENT_EFFORT_OPTIONS: Record<AgentCli, string[]> = {
  claude: ['low', 'medium', 'high', 'xhigh', 'max'],
  codex: ['minimal', 'low', 'medium', 'high', 'xhigh'],
  gemini: [],
};

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
