/**
 * The Keeper — Termates' orchestrator brain.
 *
 * A long-lived conversational agent hosted inside the daemon. The user talks
 * to it from the Command panel; it inspects the workspace through the keeper
 * MCP toolset and reports back.
 *
 * Runtime: the user picks the engine — Codex, Claude or Gemini (see
 * keeper-engines.ts). Each turn is one headless CLI run that resumes that
 * engine's session for the conversation, so context is continuous and runs on
 * the user's own subscription.
 *
 * The brain keeps **multiple conversations** (like chat threads). Each keeps
 * one session per engine; switching engines mid-conversation starts the new
 * engine's session with a recap of the conversation so far. Everything
 * persists to ~/.termates/brain/state.json and survives daemon restarts.
 */

import { spawn, type ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import {
  DAEMON_HTTP_URL,
  KEEPER_ENGINES,
  type BrainEvent,
  type BrainMessage,
  type BrainState,
  type BrainStatus,
  type KeeperEngine,
} from './protocol.js';
import { KEEPER_ENGINE_SPECS, isOnPath, type TurnMessage } from './keeper-engines.js';
import { MAX_KEEPER_MESSAGE, isValidModel } from './keeper-limits.js';
import { appHomePath } from '../app-home.js';

const __dirname_ = path.dirname(fileURLToPath(import.meta.url));

/** Cap each conversation's transcript so state.json stays small. */
const MAX_HISTORY = 240;
/** Cap how many conversations are kept (oldest dropped beyond this). */
const MAX_CONVERSATIONS = 50;
/** How much earlier conversation a newly switched-in engine is given. */
const RECAP_MESSAGES = 30;
const RECAP_CHARS = 12_000;

const BRAIN_DIR = appHomePath('brain');
const STATE_PATH = path.join(BRAIN_DIR, 'state.json');
const DEFAULT_ENGINE: KeeperEngine = 'codex';

/**
 * Appended to every turn's input. Engines bake the persona in when a session
 * starts and do not re-read it on resume, so a rule that must apply to
 * existing conversations has to ride on the turn itself.
 */
const TURN_SUFFIX =
  '\n\n---\n[System reminder] You are speaking aloud as you work — be ' +
  'conversational.\n' +
  '(1) Before each significant step (reading a project, checking a wiki, ' +
  'asking an agent), write one short, plain, conversational sentence saying ' +
  'what you are about to do — e.g. "我先看一下 ardi 的 wiki。". These lines ' +
  'are read aloud so the user hears you working.\n' +
  '(2) End your reply with a final line starting with 🔊 — a spoken summary ' +
  'of 2 to 4 full sentences: what was done, the current state, and what is ' +
  'needed next. Informative and specific, not a one-line platitude.\n' +
  'All spoken lines: plain language, no markdown, no file paths.';

/** The Keeper's persona + operating rules, given to every engine. */
const AGENTS_MD = `# The Keeper — Termates Orchestrator Brain

You are **The Keeper**, the orchestrator brain of Termates — a command center
for a team of coding CLI agents. Each agent is one terminal running a CLI, and
the app calls it a **cligent** — when the user says cligent, they mean an
agent. The user talks to you in plain language; you inspect the workspace and
report back. Act like a sharp chief-of-staff: concise, accurate, and proactive
about what needs the user's attention.

## Your tools (MCP server \`keeper\`)

- \`list_projects\` — every project and its agents, with live status.
- \`list_agents\` — the agents of one project, in detail.
- \`get_agent_status\` — the live status of one agent.
- \`get_project_overview\` — read a project's wiki overview to learn what it does.
- \`read_wiki\` — read a project's wiki pages (its knowledge base).
- \`read_shared\` — read a project's shared content files.
- \`create_project\` — create a new project/team (needs a name + working directory).
- \`create_agent\` — add an agent to a project (claude / codex / gemini).
- \`start_agent\` — start a stopped agent (it resumes its previous session).
- \`stop_agent\` — stop a running agent (its session is kept; start_agent resumes it).
- \`ask_agent\` — send a question or instruction to one agent and get its reply.
- \`broadcast\` — ask every running agent at once (optionally scoped to a project).

## How to work

1. Use the tools — never guess. Start with \`list_projects\` to see the teams.
   \`get_project_overview\` tells you what a project is about without bothering
   an agent; \`broadcast\` collects status from every running agent in one shot.
2. To get something from an agent, call \`ask_agent(project, agent, message)\`.
   It delivers your message into that agent's live session and returns its reply.
3. **A stopped agent is never a dead end.** If an agent you need is stopped,
   you MUST call \`start_agent\` on it and then \`ask_agent\` — in the same turn.
   \`start_agent\` boots it and resumes its previous session, so it keeps its
   prior context. Starting agents is safe and pre-approved: never ask the user
   for permission first, and never answer with just "the agent is stopped".
   If you started an agent only to check on it, offer to \`stop_agent\` it
   again afterwards so the workspace isn't left cluttered with processes the user
   didn't intend to keep running.
4. To set up a new team, use \`create_project\` — it needs a working directory,
   so if the user didn't give one, ask. To add a team member, use
   \`create_agent\` (then \`start_agent\` it if they want it running). These
   create lasting structure — confirm the name, directory, and CLI with the
   user if anything is unclear.
5. **Keep project wikis current — by delegation, not by hand.** A project's
   wiki is its living memory, and the project's own agents own it: they have
   first-hand knowledge and are already instructed to update their wiki when
   asked. To record progress, decisions, or architecture, \`ask_agent\` the
   relevant agent to update its own wiki. Never author a project wiki yourself
   — your information is second-hand.
6. Synthesize. Don't dump raw tool output — give a short, clear summary.
   Surface blockers and anything that needs a decision from the user.
7. Be concise. A few sentences or a short list — the details live on screen.
8. **End every reply with a spoken summary line starting with 🔊** — 2 to 4
   full sentences that convey the substance: what was done, the current
   state, and what is needed next. Brief a colleague — informative and
   specific, not a one-line platitude. Plain spoken language, all on a single
   line, no markdown, no file paths. This line is read aloud. Example:
   \`🔊 兩個 agent 都寫好了協作測試計畫:Claude 偏流程,涵蓋訊息傳遞、shared content 與 wiki 測試;Codex 偏執行面,用 progress.md 追蹤 Done/Blocked。目前兩邊都沒有 blocker,等你指定下一步。\`

## Boundaries (Phase 1)

- You are **advisory**. Inspecting agents, starting and stopping them, asking
  them questions, and creating projects/agents **when the user asks** are all safe.
- Never create a project or agent the user didn't ask for.
- Relay an instruction that changes code or deploys only when the user
  explicitly asks. Do not invent work on your own.
- Do not run shell commands. Use only the \`keeper\` tools.
- Never pretend you reached an agent you didn't.
`;


/** One brain conversation — one session per engine, and its transcript. */
interface Conversation {
  id: string;
  title: string;
  sessions: Partial<Record<KeeperEngine, string>>;
  /** Engine of the last turn; a different one gets a recap first. */
  lastEngine?: KeeperEngine;
  messages: BrainMessage[];
  createdAt: string;
  updatedAt: string;
}

interface KeeperSettings {
  engine: KeeperEngine;
  /** Per-engine model; missing or '' is the engine's default. */
  models: Partial<Record<KeeperEngine, string>>;
}

interface PersistedState {
  conversations: Conversation[];
  currentId: string;
  settings: KeeperSettings;
}

const isEngine = (value: unknown): value is KeeperEngine =>
  typeof value === 'string' && (KEEPER_ENGINES as readonly string[]).includes(value);

/** cmd.exe-safe quoting — only needed when spawning with `shell: true`. */
function winQuote(arg: string): string {
  if (arg === '') return '""';
  if (!/[ \t"&|<>()^%]/.test(arg)) return arg;
  return '"' + arg.replace(/"/g, '""') + '"';
}

export class Orchestrator {
  private conversations: Conversation[] = [];
  private currentId = '';
  private settings: KeeperSettings = { engine: DEFAULT_ENGINE, models: {} };
  private status: BrainStatus = 'idle';
  private busy = false;
  /** The CLI child for the in-flight turn, so abortTurn() can kill it. */
  private currentChild: ChildProcess | null = null;
  /** True between an abortTurn() call and the next send() — keeps repeated
   *  Stop presses from spamming "Cancelled by user" messages. */
  private aborting = false;

  private readonly keeperMcpPath = path.resolve(__dirname_, '../keeper-mcp-server.js');

  constructor(private readonly emit: (ev: BrainEvent) => void) {
    this.load();
  }

  // ─────────────────────────── Public API ───────────────────────────

  getState(): BrainState {
    const cur = this.current();
    return {
      messages: cur.messages,
      status: this.status,
      engine: this.settings.engine,
      model: this.settings.models[this.settings.engine] ?? '',
      engines: KEEPER_ENGINES.map((id) => ({
        id,
        label: KEEPER_ENGINE_SPECS[id].label,
        available: isOnPath(KEEPER_ENGINE_SPECS[id].binary),
      })),
      currentId: this.currentId,
      conversations: [...this.conversations]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((c) => ({
          id: c.id,
          title: c.title,
          updatedAt: c.updatedAt,
          messageCount: c.messages.length,
        })),
    };
  }

  /** Choose the engine for the next turns; `model` omitted keeps its saved one. */
  setSettings(engine: KeeperEngine, model?: string): void {
    if (!isEngine(engine) || (model !== undefined && !isValidModel(model))) return;
    this.settings = {
      engine,
      models: model === undefined ? this.settings.models : { ...this.settings.models, [engine]: model },
    };
    this.save();
    this.emitState();
  }

  /** Start a fresh conversation (keeps the existing ones). */
  newConversation(): void {
    const conv = this.makeConversation();
    this.conversations.push(conv);
    this.trimConversations();
    this.currentId = conv.id;
    this.save();
    this.emitState();
  }

  /** Switch the active conversation. */
  switchConversation(id: string): void {
    if (id === this.currentId) return;
    if (!this.conversations.some((c) => c.id === id)) return;
    this.currentId = id;
    this.save();
    this.emitState();
  }

  /** Delete a conversation. Always keeps at least one. */
  deleteConversation(id: string): void {
    const idx = this.conversations.findIndex((c) => c.id === id);
    if (idx < 0) return;
    this.conversations.splice(idx, 1);
    if (this.conversations.length === 0) {
      this.conversations.push(this.makeConversation());
    }
    if (this.currentId === id) {
      this.currentId = [...this.conversations]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0].id;
    }
    this.save();
    this.emitState();
  }

  /** Run one brain turn for a user message. */
  async send(message: string): Promise<void> {
    const text = message.trim().slice(0, MAX_KEEPER_MESSAGE);
    if (!text) return;

    // The turn targets whichever conversation is current right now; capture it
    // so a mid-turn switch doesn't misroute the streamed messages.
    const conv = this.current();

    if (this.busy) {
      this.append(conv, {
        role: 'system',
        text: 'The Keeper is still working on the previous request — one moment.',
      });
      return;
    }

    this.busy = true;
    this.aborting = false;
    const engine = this.settings.engine;
    const prompt = this.recapFor(conv, engine) + text;
    if (conv.messages.length === 0) conv.title = makeTitle(text);
    this.append(conv, { role: 'user', text });
    this.setStatus('thinking');

    try {
      await this.runTurn(conv, engine, prompt);
    } catch (err) {
      this.append(conv, {
        role: 'error',
        text: 'The Keeper turn failed: ' + (err instanceof Error ? err.message : String(err)),
      });
    } finally {
      this.busy = false;
      this.setStatus('idle');
      this.save();
      this.emitState(); // refresh the conversation list (title / updatedAt / count)
    }
  }

  /**
   * Cancel the in-flight Keeper turn. Kills the running CLI child; its `close`
   * handler then resolves runTurn, send()'s finally block runs, busy clears,
   * status flips back to idle. A system marker is appended so the conversation
   * shows what happened.
   */
  abortTurn(): boolean {
    const child = this.currentChild;
    if (!child || !this.busy) return false;
    // Don't null currentChild here — let the child's 'close' handler clear
    // it when the process actually dies, so a second Stop press can retry.
    if (process.platform === 'win32' && child.pid) {
      // shell: true → child IS cmd.exe; taskkill /T /F takes the whole tree.
      try {
        const tk = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true });
        tk.on('error', (err) => console.warn('[orchestrator] taskkill spawn failed:', err));
      } catch (err) {
        console.warn('[orchestrator] taskkill spawn threw:', err);
      }
    } else {
      try {
        child.kill();
      } catch (err) {
        console.warn('[orchestrator] child.kill() threw:', err);
      }
    }

    if (!this.aborting) {
      this.aborting = true;
      this.append(this.current(), {
        role: 'system',
        text: 'Cancelled by user — the Keeper stopped mid-turn.',
      });
    }
    return true;
  }

  // ─────────────────────────── One turn ───────────────────────────

  /**
   * A conversation continued on a different engine than its last turn starts
   * that engine's session with the transcript so far, so nothing is lost.
   */
  private recapFor(conv: Conversation, engine: KeeperEngine): string {
    if (conv.sessions[engine] || !conv.lastEngine || conv.lastEngine === engine) return '';
    const lines = conv.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-RECAP_MESSAGES)
      .map((m) => `${m.role === 'user' ? 'User' : 'Keeper'}: ${m.text}`);
    let recap = lines.join('\n\n');
    if (recap.length > RECAP_CHARS) recap = '…' + recap.slice(-RECAP_CHARS);
    if (!recap) return '';
    return (
      '[Earlier in this conversation, on another engine — for context only]\n' +
      recap +
      '\n[End of earlier conversation]\n\n'
    );
  }

  private runTurn(conv: Conversation, engine: KeeperEngine, prompt: string): Promise<void> {
    const spec = KEEPER_ENGINE_SPECS[engine];
    fs.mkdirSync(BRAIN_DIR, { recursive: true });
    const turn = spec.prepare({
      brainDir: BRAIN_DIR,
      persona: AGENTS_MD,
      mcpCommand: process.execPath,
      mcpArgs: [this.keeperMcpPath, '--daemon', DAEMON_HTTP_URL],
      model: this.settings.models[engine] ?? '',
      sessionId: conv.sessions[engine] ?? null,
      // The spoken-summary rule rides on every turn — resume won't re-read
      // the persona.
      prompt: prompt + TURN_SUFFIX,
    });
    const parser = spec.parser();

    const setSession = (id: string | undefined) => {
      if (!id || conv.sessions[engine] === id) return;
      conv.sessions = { ...conv.sessions, [engine]: id };
      this.save();
    };
    conv.lastEngine = engine;
    if (turn.sessionId) setSession(turn.sessionId);

    const isWin = process.platform === 'win32';
    return new Promise<void>((resolve) => {
      let child: ChildProcess;
      try {
        child = spawn(turn.command, isWin ? turn.args.map(winQuote) : turn.args, {
          cwd: turn.cwd,
          env: turn.env,
          shell: isWin,
          windowsHide: true,
        });
      } catch (err) {
        this.append(conv, { role: 'error', text: this.notInstalled(spec.label, spec.binary, err) });
        resolve();
        return;
      }
      this.currentChild = child;

      let stdoutBuf = '';
      let stderrBuf = '';
      let answered = false;
      const take = (messages: TurnMessage[]) => {
        for (const m of messages) {
          this.append(conv, m);
          if (m.role === 'assistant') answered = true;
        }
      };

      child.stdin?.on('error', () => { /* ignore broken pipe */ });
      if (turn.stdin) child.stdin?.write(turn.stdin);
      child.stdin?.end();

      child.stdout?.on('data', (d: Buffer) => {
        stdoutBuf += d.toString();
        let nl: number;
        while ((nl = stdoutBuf.indexOf('\n')) >= 0) {
          const line = stdoutBuf.slice(0, nl).trim();
          stdoutBuf = stdoutBuf.slice(nl + 1);
          if (!line) continue;
          const result = parser.line(line);
          setSession(result.sessionId);
          take(result.messages);
        }
      });

      child.stderr?.on('data', (d: Buffer) => {
        stderrBuf += d.toString();
        if (stderrBuf.length > 8000) stderrBuf = stderrBuf.slice(-8000);
      });

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (this.currentChild === child) this.currentChild = null;
        try { turn.afterRun?.(); } catch { /* best-effort */ }
        if (turn.lastMessageFile) {
          try { fs.rmSync(turn.lastMessageFile, { force: true }); } catch { /* ignore */ }
        }
        resolve();
      };

      child.on('error', (err) => {
        this.append(conv, { role: 'error', text: this.notInstalled(spec.label, spec.binary, err) });
        finish();
      });

      child.on('close', (code) => {
        if (stdoutBuf.trim()) {
          const result = parser.line(stdoutBuf.trim());
          setSession(result.sessionId);
          take(result.messages);
        }
        take(parser.end());
        // Safety net: an engine that wrote its answer to a file but streamed
        // none of it.
        if (!answered && turn.lastMessageFile) {
          let last = '';
          try { last = fs.readFileSync(turn.lastMessageFile, 'utf-8').trim(); } catch { /* none */ }
          if (last) take([{ role: 'assistant', text: last }]);
        }
        if (!answered && code !== 0 && !this.aborting) {
          const detail = stderrBuf.trim().split('\n').slice(-4).join('\n');
          this.append(conv, {
            role: 'error',
            text: `${spec.label} exited with code ${code}.` + (detail ? `\n${detail}` : ''),
          });
        }
        finish();
      });
    });
  }

  private notInstalled(label: string, binary: string, err: unknown): string {
    const detail = err instanceof Error ? err.message : String(err);
    return `Could not start ${label}. Is the \`${binary}\` CLI installed and signed in? ${detail}`;
  }

  // ─────────────────────────── State ───────────────────────────

  private current(): Conversation {
    return this.conversations.find((c) => c.id === this.currentId) || this.conversations[0];
  }

  private makeConversation(): Conversation {
    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      title: 'New conversation',
      sessions: {},
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  /** Drop the oldest conversations beyond the cap. */
  private trimConversations(): void {
    if (this.conversations.length <= MAX_CONVERSATIONS) return;
    this.conversations.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    this.conversations = this.conversations.slice(0, MAX_CONVERSATIONS);
  }

  private append(conv: Conversation, m: TurnMessage): void {
    const message: BrainMessage = { id: randomUUID(), ts: new Date().toISOString(), ...m };
    conv.messages.push(message);
    if (conv.messages.length > MAX_HISTORY) {
      conv.messages.splice(0, conv.messages.length - MAX_HISTORY);
    }
    conv.updatedAt = message.ts;
    this.emit({ kind: 'append', conversationId: conv.id, message });
  }

  private setStatus(status: BrainStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.emit({ kind: 'status', status });
  }

  private emitState(): void {
    this.emit({ kind: 'state', state: this.getState() });
  }

  private load(): void {
    try {
      if (fs.existsSync(STATE_PATH)) {
        const data = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
        if (Array.isArray(data.conversations) && data.conversations.length > 0) {
          this.conversations = data.conversations.map(normalizeConversation);
          this.currentId = typeof data.currentId === 'string' ? data.currentId : '';
        } else if (Array.isArray(data.messages)) {
          // Migrate the old single-conversation shape ({ threadId, messages }).
          const conv = normalizeConversation({ ...this.makeConversation(), threadId: data.threadId, messages: data.messages });
          const firstUser = conv.messages.find((m) => m?.role === 'user');
          if (firstUser) conv.title = makeTitle(firstUser.text);
          this.conversations = [conv];
          this.currentId = conv.id;
        }
        const settings = data.settings as Partial<KeeperSettings> | undefined;
        if (settings && isEngine(settings.engine)) {
          const models: Partial<Record<KeeperEngine, string>> = {};
          for (const id of KEEPER_ENGINES) {
            const model = settings.models?.[id];
            if (typeof model === 'string' && isValidModel(model)) models[id] = model;
          }
          this.settings = { engine: settings.engine, models };
        }
      }
    } catch {
      this.conversations = [];
    }
    if (this.conversations.length === 0) {
      const conv = this.makeConversation();
      this.conversations = [conv];
      this.currentId = conv.id;
    }
    if (!this.conversations.some((c) => c.id === this.currentId)) {
      this.currentId = this.conversations[0].id;
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(BRAIN_DIR, { recursive: true });
      const data: PersistedState = {
        conversations: this.conversations,
        currentId: this.currentId,
        settings: this.settings,
      };
      // Write-then-rename so a crash mid-write never truncates the history.
      const tmp = `${STATE_PATH}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { encoding: 'utf-8', mode: 0o600 });
      fs.renameSync(tmp, STATE_PATH);
    } catch { /* best-effort persistence */ }
  }
}

/**
 * Accept a stored conversation from any earlier version: pre-engine ones kept
 * a single Codex `threadId`.
 */
function normalizeConversation(raw: Record<string, unknown>): Conversation {
  const now = new Date().toISOString();
  const sessions: Partial<Record<KeeperEngine, string>> = {};
  const stored = raw.sessions as Record<string, unknown> | undefined;
  for (const id of KEEPER_ENGINES) {
    if (typeof stored?.[id] === 'string') sessions[id] = stored[id] as string;
  }
  if (!sessions.codex && typeof raw.threadId === 'string' && raw.threadId) sessions.codex = raw.threadId;
  const messages = Array.isArray(raw.messages) ? (raw.messages as BrainMessage[]) : [];
  return {
    id: typeof raw.id === 'string' ? raw.id : randomUUID(),
    title: typeof raw.title === 'string' ? raw.title : 'New conversation',
    sessions,
    lastEngine: isEngine(raw.lastEngine) ? raw.lastEngine : sessions.codex ? 'codex' : undefined,
    messages,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
  };
}

/** Make a short conversation title from the first user message. */
function makeTitle(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return 'New conversation';
  return t.length > 48 ? t.slice(0, 48) + '…' : t;
}
