export interface Project {
  id: string;
  name: string;
  description?: string;
  cwd: string;
  createdAt: string;
}

/**
 * Agent status. v2.1 derives the finer states from Claude Code lifecycle hooks:
 *   running        — actively working
 *   awaiting_input — finished a turn / asked something — needs the user
 *   idle           — awaiting_input for a while with no attention
 *   stopped        — not running
 */
export type AgentStatus = 'stopped' | 'running' | 'idle' | 'awaiting_input';

/** The CLIs an agent may run. Single source of truth for validation. */
export const AGENT_CLIS = ['claude', 'codex', 'gemini'] as const;

export type AgentCli = (typeof AGENT_CLIS)[number];

export interface Agent {
  id: string;
  projectId: string;
  name: string;
  role?: string;
  cli: AgentCli;
  cwd: string;
  status: AgentStatus;
  pid?: number;
  /** Launch-time model override, empty/absent means the CLI's default. */
  model?: string;
  /** Launch-time reasoning effort; Gemini has no equivalent flag. */
  effort?: string;
  /** Gemini thinking mode: 'on' | 'off'; absent leaves the model default. */
  thinking?: string;
  /** Permission mode; the flag differs per CLI, the stored value does not. */
  permissionMode?: string;
  /** Claude only: --autocompact window ('auto' or a token count). */
  autocompact?: string;
  flags?: {
    dangerouslySkipPermissions?: boolean;
    remoteControl?: boolean;
  };
}

export interface SharedContent {
  id: string;
  projectId: string;
  filename: string;
  content: string;
  createdBy: string;
  updatedAt: string;
}

export interface ProjectData {
  project: Project;
  agents: Agent[];
}

import type { BrainEvent, CodexItem } from './daemon/protocol.js';

// WebSocket message types
export type WSClientMessage =
  | { type: 'terminal:attach'; agentId: string }
  | { type: 'terminal:input'; agentId: string; data: string }
  | { type: 'terminal:detach'; agentId: string }
  | { type: 'terminal:resize'; agentId: string; cols: number; rows: number }
  | { type: 'brain:send'; message: string }
  | { type: 'brain:new' }
  | { type: 'brain:abort' }
  | { type: 'brain:switch'; conversationId: string }
  | { type: 'brain:delete'; conversationId: string };

export interface ActivityEvent {
  id: string;
  projectId: string;
  agentId?: string;
  agentName?: string;
  event: 'agent:started' | 'agent:stopped' | 'content:created' | 'content:modified' | 'content:deleted' | 'user:input' | 'agent:message';
  detail: string;
  timestamp: string;
  // For agent:message events
  fromAgent?: string;
  toAgent?: string;
  message?: string;
}

export interface AgentMessage {
  fromAgentId: string;
  fromAgentName: string;
  toAgentId: string;
  toAgentName: string;
  message: string;
  timestamp: string;
}

export type WSServerMessage =
  | { type: 'terminal:output'; agentId: string; data: string }
  | { type: 'agent:status'; agentId: string; status: string }
  | { type: 'content:updated'; projectId: string; filename: string }
  | { type: 'activity'; event: ActivityEvent }
  | { type: 'brain:event'; payload: BrainEvent }
  | { type: 'org:changed' }
  | { type: 'codex:item'; agentId: string; item: CodexItem };
