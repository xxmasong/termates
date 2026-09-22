export interface Project {
  id: string;
  name: string;
  description?: string;
  cwd: string;
  createdAt: string;
}

export type AgentStatus = 'stopped' | 'running' | 'idle' | 'awaiting_input';

export interface Agent {
  id: string;
  projectId: string;
  name: string;
  role?: string;
  cli: 'claude' | 'codex' | 'gemini';
  cwd: string;
  status: AgentStatus;
  pid?: number;
  /** Launch-time model override, empty/absent means the CLI's default. */
  model?: string;
  /** Launch-time reasoning effort; Gemini has no equivalent flag. */
  effort?: string;
  flags?: {
    dangerouslySkipPermissions?: boolean;
    remoteControl?: boolean;
  };
}

export interface Teammate {
  id: string;
  name: string;
  role?: string;
  cli: Agent['cli'];
  status: AgentStatus;
}

export interface AgentTeammatesResponse {
  self: {
    id: string;
    name: string;
    role?: string;
  };
  teammates: Teammate[];
}

export interface SharedContent {
  id: string;
  projectId: string;
  filename: string;
  content: string;
  createdBy: string;
  updatedAt: string;
}

export interface ActivityEvent {
  id: string;
  projectId: string;
  agentId?: string;
  agentName?: string;
  event:
    | 'agent:started'
    | 'agent:stopped'
    | 'content:created'
    | 'content:modified'
    | 'content:deleted'
    | 'user:input'
    | 'agent:message';
  detail: string;
  timestamp: string;
  fromAgent?: string;
  toAgent?: string;
  message?: string;
}

export interface BrainMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'reasoning' | 'system' | 'error';
  text: string;
  ts: string;
  tool?: string;
}

export type BrainStatus = 'idle' | 'thinking';

export interface BrainConversationMeta {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

export interface BrainState {
  messages: BrainMessage[];
  status: BrainStatus;
  engine: 'codex' | 'claude';
  currentId: string;
  conversations: BrainConversationMeta[];
}

export type BrainEvent =
  | { kind: 'append'; conversationId: string; message: BrainMessage }
  | { kind: 'status'; status: BrainStatus }
  | { kind: 'state'; state: BrainState };

export interface CodexItem {
  id: string;
  kind: 'message' | 'reasoning' | 'command' | 'file' | 'tool' | 'error' | 'system';
  role?: 'agent' | 'user';
  text?: string;
  command?: string;
  output?: string;
  exitCode?: number | null;
  path?: string;
  diff?: string;
  server?: string;
  tool?: string;
  args?: string;
  result?: string;
  status?: 'running' | 'done' | 'failed';
  ts: string;
}

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

export type WSServerMessage =
  | { type: 'terminal:output'; agentId: string; data: string }
  | { type: 'agent:status'; agentId: string; status: string }
  | { type: 'content:updated'; projectId: string; filename: string }
  | { type: 'activity'; event: ActivityEvent }
  | { type: 'brain:event'; payload: BrainEvent }
  | { type: 'org:changed' }
  | { type: 'codex:item'; agentId: string; item: CodexItem };
