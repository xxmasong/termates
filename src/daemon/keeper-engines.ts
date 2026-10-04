/**
 * keeper-engines.ts — how each AI engine runs one Keeper turn.
 *
 * Every engine gets the same persona and the same `keeper` MCP toolset and
 * nothing else: no shell, no file tools, no approval bypass. One headless CLI
 * process runs per turn and resumes the engine's own session on the next one.
 *
 *   codex   `codex exec [resume <thread>] --json`, read-only sandbox, the
 *           keeper server's tools pre-approved in a dedicated CODEX_HOME
 *   claude  `claude -p --output-format stream-json`, built-in tools disabled
 *           (`--tools ""`), only mcp__keeper__* allowed
 *   gemini  `gemini -p -o stream-json`, built-in tools disabled
 *           (`tools.core: []`), only the trusted keeper server
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import type { BrainMessage, KeeperEngine } from './protocol.js';

export type TurnMessage = Omit<BrainMessage, 'id' | 'ts'>;

export interface EngineContext {
  brainDir: string;
  /** The Keeper persona (AGENTS.md). */
  persona: string;
  /** How to launch the keeper MCP server. */
  mcpCommand: string;
  mcpArgs: string[];
  /** '' leaves the engine on its own default model. */
  model: string;
  /** The engine's session to resume, or null to start one. */
  sessionId: string | null;
  prompt: string;
}

export interface EngineTurn {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  /** Written to stdin, which is then closed. */
  stdin: string;
  /** Session id fixed before the run (claude / gemini take one up front). */
  sessionId: string | null;
  /** File the engine writes its final answer to, read when nothing streamed. */
  lastMessageFile?: string;
  /** Runs once the process has exited. */
  afterRun?: () => void;
}

export interface LineResult {
  messages: TurnMessage[];
  sessionId?: string;
}

/** Turns one engine's stdout lines into Keeper messages. */
export interface EngineParser {
  line(line: string): LineResult;
  /** Flushes anything buffered when the process exits. */
  end(): TurnMessage[];
}

export interface KeeperEngineSpec {
  id: KeeperEngine;
  label: string;
  binary: string;
  prepare(ctx: EngineContext): EngineTurn;
  parser(): EngineParser;
}

const MCP_SERVER = 'keeper';
const TOOL_SUMMARY_MAX = 600;

const parseJson = (line: string): Record<string, unknown> | null => {
  try {
    const value: unknown = JSON.parse(line);
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

const summarize = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  try {
    return (typeof value === 'string' ? value : JSON.stringify(value)).slice(0, TOOL_SUMMARY_MAX);
  } catch {
    return '';
  }
};

/** "mcp__keeper__ask_agent" / "mcp_keeper_ask_agent" → "keeper/ask_agent". */
export function toolLabel(name: string): string {
  const match = /^mcp_{1,2}([a-z0-9-]+?)_{1,2}(.+)$/i.exec(name);
  return match ? `${match[1]}/${match[2]}` : name;
}

/** TOML basic-string literal with proper escaping. */
const tomlStr = (s: string): string => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

// ─────────────────────────── Codex ───────────────────────────

/** Top-level `model` / `service_tier` lines of the user's own Codex config. */
function userCodexDefaults(): string[] {
  const out: string[] = [];
  try {
    const file = path.join(os.homedir(), '.codex', 'config.toml');
    for (const raw of fs.readFileSync(file, 'utf-8').split('\n')) {
      const line = raw.trim();
      if (line.startsWith('[')) break;
      if (/^(model|service_tier)\s*=/.test(line)) out.push(line);
    }
  } catch {
    /* Codex defaults */
  }
  return out;
}

/** `last_refresh` of a Codex auth.json, or 0 when missing or unreadable. */
function authRefreshedAt(file: string): number {
  try {
    const value = (JSON.parse(fs.readFileSync(file, 'utf-8')) as { last_refresh?: unknown }).last_refresh;
    const at = typeof value === 'string' ? Date.parse(value) : NaN;
    return Number.isFinite(at) ? at : 0;
  } catch {
    return 0;
  }
}

/** Copy a Codex auth.json over another when it was refreshed more recently. */
export function syncNewerAuth(from: string, to: string): void {
  try {
    if (!fs.existsSync(from)) return;
    if (fs.existsSync(to) && authRefreshedAt(from) <= authRefreshedAt(to)) return;
    const tmp = `${to}.${process.pid}.tmp`;
    fs.copyFileSync(from, tmp);
    fs.chmodSync(tmp, 0o600);
    fs.renameSync(tmp, to);
  } catch {
    /* may still authenticate via OPENAI_API_KEY */
  }
}

const codex: KeeperEngineSpec = {
  id: 'codex',
  label: 'Codex',
  binary: 'codex',
  prepare(ctx) {
    const home = path.join(ctx.brainDir, 'codex-home');
    fs.mkdirSync(home, { recursive: true });
    const defaults = userCodexDefaults().filter((line) => !(ctx.model && line.startsWith('model')));
    const config = [
      '# Termates Keeper — managed by Termates. Do not edit.',
      ...defaults,
      ...(ctx.model ? [`model = ${tomlStr(ctx.model)}`] : []),
      // Read-only and never asks: the Keeper acts only through its MCP tools,
      // which are pre-approved below. Shell commands cannot write anything.
      'sandbox_mode = "read-only"',
      'approval_policy = "never"',
      '',
      `[mcp_servers.${MCP_SERVER}]`,
      `command = ${tomlStr(ctx.mcpCommand)}`,
      `args = [${ctx.mcpArgs.map(tomlStr).join(', ')}]`,
      'default_tools_approval_mode = "approve"',
      '',
    ].join('\n');
    fs.writeFileSync(path.join(home, 'config.toml'), config, 'utf-8');
    // The Keeper runs on the user's own Codex subscription.
    const userAuth = path.join(os.homedir(), '.codex', 'auth.json');
    const keeperAuth = path.join(home, 'auth.json');
    syncNewerAuth(userAuth, keeperAuth);
    fs.writeFileSync(path.join(ctx.brainDir, 'AGENTS.md'), ctx.persona, 'utf-8');

    const lastMessageFile = path.join(ctx.brainDir, `lastmsg-${randomUUID()}.txt`);
    const common = ['--json', '--skip-git-repo-check', '-o', lastMessageFile, '-'];
    const args = ctx.sessionId
      ? ['exec', 'resume', ctx.sessionId, ...common]
      : ['exec', '--cd', ctx.brainDir, ...common];
    return {
      command: 'codex',
      args,
      cwd: ctx.brainDir,
      env: { ...process.env, CODEX_HOME: home },
      stdin: ctx.prompt,
      sessionId: ctx.sessionId,
      lastMessageFile,
      // Codex rotates the refresh token when it refreshes; hand a refreshed
      // login back, or the user's own cligents are left holding a dead token.
      afterRun: () => syncNewerAuth(keeperAuth, userAuth),
    };
  },
  parser() {
    return {
      line(line) {
        const obj = parseJson(line);
        if (!obj) return { messages: [] };
        if (obj.type === 'thread.started' && typeof obj.thread_id === 'string') {
          return { messages: [], sessionId: obj.thread_id };
        }
        if (obj.type === 'item.completed') {
          const msg = codexItem(obj.item as Record<string, unknown> | undefined);
          return { messages: msg ? [msg] : [] };
        }
        if (obj.type === 'turn.failed' || obj.type === 'error') {
          const e = (obj.error || obj) as { message?: string };
          return { messages: [{ role: 'error', text: e.message || 'The Keeper turn failed.' }] };
        }
        return { messages: [] };
      },
      end: () => [],
    };
  },
};

function codexItem(item: Record<string, unknown> | undefined): TurnMessage | null {
  if (!item) return null;
  const type = String(item.type || '');
  if (type === 'agent_message') {
    const text = String(item.text || '').trim();
    return text ? { role: 'assistant', text } : null;
  }
  if (type === 'reasoning') {
    const text = String(item.text || item.summary || '').trim();
    return text ? { role: 'reasoning', text } : null;
  }
  if (type === 'command_execution') {
    return { role: 'tool', tool: 'shell', text: '$ ' + String(item.command || item.cmd || '(command)') };
  }
  if (type === 'mcp_tool_call' || type.includes('mcp') || type.includes('tool_call')) {
    const name = String(item.tool || item.name || item.tool_name || 'tool');
    const server = item.server ? `${String(item.server)}/` : '';
    return {
      role: 'tool',
      tool: server + name,
      text: summarize(item.arguments ?? item.input ?? item.args),
    };
  }
  if (type === 'error') return { role: 'error', text: String(item.message || 'error') };
  return null;
}

// ─────────────────────────── Claude ───────────────────────────

const claude: KeeperEngineSpec = {
  id: 'claude',
  label: 'Claude',
  binary: 'claude',
  prepare(ctx) {
    const dir = path.join(ctx.brainDir, 'claude');
    fs.mkdirSync(dir, { recursive: true });
    const mcpConfig = path.join(dir, 'mcp.json');
    fs.writeFileSync(
      mcpConfig,
      JSON.stringify(
        { mcpServers: { [MCP_SERVER]: { type: 'stdio', command: ctx.mcpCommand, args: ctx.mcpArgs } } },
        null,
        2,
      ),
      'utf-8',
    );
    const sessionId = ctx.sessionId ?? randomUUID();
    const args = [
      '-p',
      '--output-format', 'stream-json',
      '--verbose',
      // No built-in tools at all — only the keeper MCP server.
      '--tools', '',
      '--strict-mcp-config',
      '--mcp-config', mcpConfig,
      '--allowedTools', `mcp__${MCP_SERVER}__*`,
      '--permission-mode', 'default',
      ...(ctx.model ? ['--model', ctx.model] : []),
      ...(ctx.sessionId ? ['--resume', ctx.sessionId] : ['--session-id', sessionId]),
      '--append-system-prompt', ctx.persona,
    ];
    return { command: 'claude', args, cwd: dir, env: { ...process.env }, stdin: ctx.prompt, sessionId };
  },
  parser() {
    return {
      line(line) {
        const obj = parseJson(line);
        if (!obj) return { messages: [] };
        const sessionId = typeof obj.session_id === 'string' ? obj.session_id : undefined;
        if (obj.type === 'assistant') {
          const content = (obj.message as { content?: unknown } | undefined)?.content;
          const messages: TurnMessage[] = [];
          for (const block of Array.isArray(content) ? content : []) {
            const b = block as Record<string, unknown>;
            if (b.type === 'text' && typeof b.text === 'string' && b.text.trim()) {
              messages.push({ role: 'assistant', text: b.text.trim() });
            } else if (b.type === 'thinking' && typeof b.thinking === 'string' && b.thinking.trim()) {
              messages.push({ role: 'reasoning', text: b.thinking.trim() });
            } else if (b.type === 'tool_use') {
              messages.push({ role: 'tool', tool: toolLabel(String(b.name || 'tool')), text: summarize(b.input) });
            }
          }
          return { messages, sessionId };
        }
        if (obj.type === 'result' && obj.is_error) {
          const text = typeof obj.result === 'string' && obj.result ? obj.result : 'The Keeper turn failed.';
          return { messages: [{ role: 'error', text }], sessionId };
        }
        return { messages: [], sessionId };
      },
      end: () => [],
    };
  },
};

// ─────────────────────────── Gemini ───────────────────────────

const gemini: KeeperEngineSpec = {
  id: 'gemini',
  label: 'Gemini',
  binary: 'gemini',
  prepare(ctx) {
    const dir = path.join(ctx.brainDir, 'gemini');
    fs.mkdirSync(path.join(dir, '.gemini'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, '.gemini', 'settings.json'),
      JSON.stringify(
        {
          // An empty allowlist registers none of Gemini's built-in tools (file
          // reads, glob, shell…); MCP tools are discovered separately.
          tools: { core: [] },
          mcpServers: { [MCP_SERVER]: { command: ctx.mcpCommand, args: ctx.mcpArgs, trust: true } },
        },
        null,
        2,
      ),
      'utf-8',
    );
    // Gemini loads GEMINI.md from the working directory on every launch.
    fs.writeFileSync(path.join(dir, 'GEMINI.md'), ctx.persona, 'utf-8');
    const sessionId = ctx.sessionId ?? randomUUID();
    const args = [
      '-o', 'stream-json',
      '--allowed-mcp-server-names', MCP_SERVER,
      ...(ctx.model ? ['-m', ctx.model] : []),
      ...(ctx.sessionId ? ['--resume', ctx.sessionId] : ['--session-id', sessionId]),
      '-p', ctx.prompt,
    ];
    return {
      command: 'gemini',
      args,
      cwd: dir,
      env: { ...process.env, GEMINI_CLI_TRUST_WORKSPACE: 'true', NO_BROWSER: '1' },
      stdin: '',
      sessionId,
    };
  },
  parser() {
    let pending = '';
    const flush = (): TurnMessage[] => {
      const text = pending.trim();
      pending = '';
      return text ? [{ role: 'assistant', text }] : [];
    };
    return {
      line(line) {
        const obj = parseJson(line);
        if (!obj) return { messages: [] };
        const sessionId = typeof obj.session_id === 'string' ? obj.session_id : undefined;
        if (obj.type === 'message' && obj.role === 'assistant' && typeof obj.content === 'string') {
          pending += obj.content;
          return { messages: [], sessionId };
        }
        if (obj.type === 'tool_use') {
          return {
            messages: [
              ...flush(),
              { role: 'tool', tool: toolLabel(String(obj.tool_name || 'tool')), text: summarize(obj.parameters) },
            ],
          };
        }
        if (obj.type === 'result') {
          const messages = flush();
          if (obj.status === 'error') {
            const e = obj.error as { message?: string } | undefined;
            messages.push({ role: 'error', text: e?.message || 'The Keeper turn failed.' });
          }
          return { messages };
        }
        return { messages: [], sessionId };
      },
      end: flush,
    };
  },
};

export const KEEPER_ENGINE_SPECS: Record<KeeperEngine, KeeperEngineSpec> = { codex, claude, gemini };

/** Whether an executable named `binary` is on PATH. */
export function isOnPath(binary: string): boolean {
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (!dir) continue;
    try {
      fs.accessSync(path.join(dir, binary), fs.constants.X_OK);
      return true;
    } catch {
      /* keep looking */
    }
  }
  return false;
}
