# Backend Contract — FROZEN

Extracted from the reference backend. The client must match this exactly.
**Do not modify `src/**`. Do not add or change endpoints.**

## REST — base `/api`

### Projects
```
GET    /projects                          -> Project[]
POST   /projects                          {name, cwd, description?} -> Project
PUT    /projects/:id                      Partial<Project> -> Project
DELETE /projects/:id?removeData=bool      -> 204
```

### Agents
```
GET    /projects/:id/agents               -> Agent[]
GET    /projects/:id/agents/previews      -> Record<agentId, string>
POST   /projects/:id/agents               {name, cli, cwd?, role?, flags?} -> Agent
PUT    /projects/:id/agents/:aid          Partial<Agent> -> Agent
DELETE /projects/:id/agents/:aid          -> 204
GET    /projects/:id/agents/:aid/teammates -> AgentTeammatesResponse
POST   /projects/:id/agents/:aid/start    -> {status}
POST   /projects/:id/agents/:aid/stop     -> {status}
POST   /projects/:id/agents/:aid/restart  -> {status}
```

### Messages / broadcast
```
POST   /projects/:id/messages             {fromAgentId, fromAgentName?, target, message} -> {delivered, toAgentId, toAgentName}
POST   /projects/:id/broadcast            {text} -> {delivered: string[], failed: string[]}
```

### Shared content
```
GET    /projects/:id/content                  -> SharedContent[]
GET    /projects/:id/content/:filename(*)     -> SharedContent
POST   /projects/:id/content                  {filename, content?, createdBy?}
PUT    /projects/:id/content/:filename(*)     {content}
DELETE /projects/:id/content/:filename(*)     -> 204
```

### Wiki (project memory)
```
GET    /projects/:id/wiki/status        -> {initialized: boolean}
POST   /projects/:id/wiki/initialize    -> {initialized: boolean}
GET    /projects/:id/wiki               -> SharedContent[]
GET    /projects/:id/wiki/:filename(*)  -> SharedContent
PUT    /projects/:id/wiki/:filename(*)  {content}
```

### Misc
```
GET    /activity?projectId? -> ActivityEvent[]
GET    /usage             -> UsageSummary
GET    /daemon/status     -> {connected: boolean}
GET    /voice/config      PUT /voice/config
POST   /voice/tts         GET /codex/models   GET /brain
```

Errors: non-2xx returns `{error: string}`. `204` returns no body.

## WebSocket — `/ws`

Same origin, `ws:`/`wss:` by page protocol. Single connection for the app.

### Client -> Server (`WSClientMessage`)
```ts
| { type: 'terminal:attach';  agentId: string }
| { type: 'terminal:input';   agentId: string; data: string }
| { type: 'terminal:detach';  agentId: string }
| { type: 'terminal:resize';  agentId: string; cols: number; rows: number }
| { type: 'codex:send';       agentId: string; text: string; model?: string; effort?: string }
| { type: 'codex:new-thread'; agentId: string }
| { type: 'brain:send';       message: string }
| { type: 'brain:new' }
| { type: 'brain:abort' }
| { type: 'brain:switch';     conversationId: string }
| { type: 'brain:delete';     conversationId: string }
```
Unknown types are ignored by the server. Malformed JSON is dropped.

### Server -> Client (`WSServerMessage`)
```ts
| { type: 'terminal:output'; agentId: string; data: string }
| { type: 'agent:status';    agentId: string; status: string }
| { type: 'content:updated'; projectId: string; filename: string }
| { type: 'activity';        event: ActivityEvent }
| { type: 'brain:event';     payload: BrainEvent }
| { type: 'org:changed' }
| { type: 'codex:item';      agentId: string; item: CodexItem }
```

**Semantics the client must honor**
- `terminal:attach` -> daemon replays the scroll buffer, then streams. Attach
  once per visible agent; detach when unmounted or hidden.
- Output arrives as raw ANSI chunks -> write straight to xterm, never into React
  state per-chunk.
- `agent:status` / `content:updated` / `org:changed` should invalidate the
  matching TanStack Query keys rather than being mirrored into Recoil.

## Types (mirror exactly)

```ts
interface Project { id: string; name: string; description?: string; cwd: string; createdAt: string }

type AgentStatus = 'stopped' | 'running' | 'idle' | 'awaiting_input';

interface Agent {
  id: string; projectId: string; name: string; role?: string;
  cli: 'claude' | 'codex' | 'gemini' | 'opencode';
  cwd: string; status: AgentStatus; pid?: number; codexThreadId?: string;
  flags?: { dangerouslySkipPermissions?: boolean; remoteControl?: boolean };
}

interface Teammate {
  id: string; name: string; role?: string;
  cli: Agent['cli']; status: AgentStatus;
}
interface AgentTeammatesResponse {
  self: { id: string; name: string; role?: string };
  teammates: Teammate[];
}

interface SharedContent {
  id: string; projectId: string; filename: string; content: string;
  createdBy: string; updatedAt: string;
}

interface ActivityEvent {
  id: string; projectId: string; agentId?: string; agentName?: string;
  event: 'agent:started'|'agent:stopped'|'content:created'|'content:modified'
       | 'content:deleted'|'user:input'|'agent:message';
  detail: string; timestamp: string;
  fromAgent?: string; toAgent?: string; message?: string;
}

interface BrainMessage {
  id: string; role: 'user'|'assistant'|'tool'|'reasoning'|'system'|'error';
  text: string; ts: string; tool?: string;
}
type BrainStatus = 'idle' | 'thinking';
interface BrainConversationMeta { id: string; title: string; updatedAt: string; messageCount: number }
interface BrainState {
  messages: BrainMessage[]; status: BrainStatus;
  engine: 'codex'|'claude'; currentId: string;
  conversations: BrainConversationMeta[];
}
type BrainEvent =
  | { kind: 'append'; conversationId: string; message: BrainMessage }
  | { kind: 'status'; status: BrainStatus }
  | { kind: 'state';  state: BrainState };

interface CodexItem {
  id: string;
  kind: 'message'|'reasoning'|'command'|'file'|'tool'|'error'|'system';
  role?: 'agent'|'user'; text?: string;
  command?: string; output?: string; exitCode?: number | null;
  path?: string; diff?: string;
  server?: string; tool?: string; args?: string; result?: string;
  status?: 'running'|'done'|'failed';
  ts: string;
}

interface UsageWindow { utilization: number; resetsAt: string }
interface CliUsage {
  session: UsageWindow | null; week: UsageWindow | null; updatedAt: string;
}
type UsageSummary = Record<string, CliUsage | null | undefined>;
```

## Runtime
Two services: `termhive.service` (web, serves client + `/api` + `/ws`) and a
daemon owning all PTYs on `127.0.0.1:3210`. The client only ever talks to the
web server.
