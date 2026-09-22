import type { AgentCli } from './types';
import type { IconName } from '@/components';

export const AGENT_CLI_OPTIONS: Array<{ value: AgentCli; label: string; icon: IconName }> = [
  { icon: 'terminal', label: 'Claude', value: 'claude' },
  { icon: 'sparkles', label: 'Codex', value: 'codex' },
  { icon: 'bolt', label: 'Gemini', value: 'gemini' },
];

/**
 * Model choices per CLI, verified against each CLI's own help output / API:
 *   claude  `--model`, aliases as `/model` lists them (--help shows only a
 *           three-item example, which is not the full set)
 *   codex   `-c model="..."` (any model id the account can reach)
 *   gemini  `--model`, names from the Generative Language models endpoint
 * An empty value leaves the CLI on its own default.
 */
export const AGENT_MODEL_OPTIONS: Record<AgentCli, string[]> = {
  claude: [
    'default',
    'opus',
    'sonnet',
    'haiku',
    'fable',
    'opusplan',
    'best',
    // 1M-token context variants
    'opus[1m]',
    'sonnet[1m]',
    'fable[1m]',
  ],
  // o3 is rejected at runtime on a ChatGPT-account login ("not supported when
  // using Codex with a ChatGPT account"), so it is not offered.
  codex: ['gpt-5.6-sol', 'gpt-5.6-codex', 'gpt-5.2-codex'],
  gemini: [
    'gemini-3.1-pro-preview',
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
  ],
};

/**
 * Reasoning effort per CLI.
 *   claude  `--effort <low|medium|high|xhigh|max>`
 *   codex   `-c model_reasoning_effort="<minimal|low|medium|high|xhigh>"`
 *   gemini  no equivalent flag, so the control is hidden
 */
export const AGENT_EFFORT_OPTIONS: Record<AgentCli, string[]> = {
  claude: ['low', 'medium', 'high', 'xhigh', 'max'],
  codex: ['minimal', 'low', 'medium', 'high', 'xhigh'],
  gemini: [],
};

/**
 * Thinking mode. Only Gemini exposes a real on/off switch, and only on models
 * that allow it: thinking cannot be disabled on Gemini 3.x or 2.5 Pro, and
 * Claude and Codex fold thinking into their effort setting rather than a
 * separate toggle. The control is therefore shown for Gemini alone.
 *   https://ai.google.dev/gemini-api/docs/thinking
 */
export const AGENT_THINKING_CLIS: AgentCli[] = ['gemini'];

/** Gemini models whose thinking cannot be turned off. */
export const AGENT_THINKING_ALWAYS_ON = [
  'gemini-3.1-pro-preview',
  'gemini-3-flash-preview',
  'gemini-2.5-pro',
];

/**
 * Remote control is a Claude-only launch flag (`--remote-control`). It is
 * absent from `claude --help` in 2.1.278 but the CLI still accepts it; Codex
 * has only an unrelated `remote-control` subcommand and Gemini has nothing.
 */
export const AGENT_REMOTE_CONTROL_CLIS: AgentCli[] = ['claude'];

/**
 * Claude's `--permission-mode`, values exactly as `claude --help` lists them.
 * This is the control the Claude Code composer shows as "Edit automatically".
 * Codex uses `-s/--sandbox` and Gemini `--approval-mode`, which are wired
 * separately below.
 */
export const AGENT_PERMISSION_MODES: Record<AgentCli, string[]> = {
  claude: ['manual', 'acceptEdits', 'auto', 'dontAsk', 'plan', 'bypassPermissions'],
  codex: ['read-only', 'workspace-write', 'danger-full-access'],
  gemini: ['default', 'auto_edit', 'yolo', 'plan'],
};

/** Claude's `--autocompact`: 'auto' or a token window between 100k and 1M. */
export const AGENT_AUTOCOMPACT_OPTIONS: Record<AgentCli, string[]> = {
  claude: ['auto', '100000', '200000', '500000', '1000000'],
  codex: [],
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
