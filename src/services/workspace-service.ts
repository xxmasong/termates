/**
 * workspace-service.ts — the workspace's business logic, independent of
 * transport. REST (routes.ts) and GraphQL (graphql/) are thin adapters over it.
 *
 * Agent runtime operations (start/stop/status/inject) go to termhive-daemon,
 * which owns every PTY.
 */

import * as activity from '../activity.js';
import type { DaemonClient } from '../daemon/client.js';
import * as storage from '../storage.js';
import { appendTranscript } from '../transcript.js';
import {
  AGENT_CLIS,
  type ActivityEvent,
  type Agent,
  type AgentStatus,
  type Project,
  type SharedContent,
} from '../types.js';
import { badRequest, notFound, ServiceError } from './errors.js';

export type AgentUpdate = Parameters<typeof storage.updateAgent>[2];
export type ProjectUpdate = Parameters<typeof storage.updateProject>[1];

export interface CreateAgentInput {
  name: string;
  cli: string;
  cwd?: string;
  role?: string;
  flags?: Agent['flags'];
}

export interface Teammate {
  id: string;
  name: string;
  role?: string;
  cli: Agent['cli'];
  status: AgentStatus;
}

export interface MessageInput {
  fromAgentId: string;
  fromAgentName?: string;
  target: string;
  message: string;
}

export interface MessageResult {
  delivered: boolean;
  toAgentId: string;
  toAgentName: string;
}

/** Side effects the transport layer fans out (WebSocket, GraphQL subscriptions). */
export interface WorkspaceEvents {
  agentStatus(agentId: string, status: string): void;
  contentUpdated(projectId: string, filename: string): void;
}

export class WorkspaceService {
  constructor(
    private readonly daemon: DaemonClient,
    private readonly events: WorkspaceEvents,
  ) {}

  // ── projects ───────────────────────────────────────────────────────────

  listProjects(): Project[] {
    return storage.listProjects();
  }

  getProject(projectId: string): Project | null {
    return storage.getProjectData(projectId)?.project ?? null;
  }

  createProject(input: { name?: string; cwd?: string; description?: string }): Project {
    if (!input.name || !input.cwd) throw badRequest('name and cwd are required');
    return storage.createProject(input.name, input.cwd, input.description);
  }

  updateProject(projectId: string, updates: ProjectUpdate): Project {
    const project = storage.updateProject(projectId, updates);
    if (!project) throw notFound('Project not found');
    return project;
  }

  deleteProject(projectId: string, removeData = false): void {
    if (!storage.deleteProject(projectId, removeData)) throw notFound('Project not found');
  }

  // ── agents ─────────────────────────────────────────────────────────────

  /** Fine-grained statuses from the daemon; unreachable daemon means nothing runs. */
  async agentStatuses(): Promise<Record<string, string>> {
    try {
      const r = await this.daemon.request('agent:statuses');
      return r.statuses;
    } catch {
      return {};
    }
  }

  async listAgents(projectId: string, statuses?: Record<string, string>): Promise<Agent[]> {
    const agents = storage.listAgents(projectId);
    const live = statuses ?? (await this.agentStatuses());
    for (const agent of agents) {
      agent.status = (live[agent.id] as AgentStatus) || 'stopped';
    }
    return agents;
  }

  async getAgent(projectId: string, agentId: string): Promise<Agent | null> {
    const agent = storage.getAgent(projectId, agentId);
    if (!agent) return null;
    const statuses = await this.agentStatuses();
    agent.status = (statuses[agent.id] as AgentStatus) || 'stopped';
    return agent;
  }

  async preview(agentId: string): Promise<string> {
    try {
      const r = await this.daemon.request('agent:preview', { agentId });
      return r.preview;
    } catch {
      return '';
    }
  }

  async previews(projectId: string): Promise<Record<string, string>> {
    const agents = storage.listAgents(projectId);
    const entries = await Promise.all(
      agents.map(async (agent) => [agent.id, await this.preview(agent.id)] as const),
    );
    return Object.fromEntries(entries);
  }

  createAgent(projectId: string, input: CreateAgentInput): Agent {
    if (!input.name || !input.cli) throw badRequest('name and cli are required');
    if (!(AGENT_CLIS as readonly string[]).includes(input.cli)) {
      throw badRequest(`cli must be one of: ${AGENT_CLIS.join(', ')}.`);
    }
    const projectData = storage.getProjectData(projectId);
    if (!projectData) throw notFound('Project not found');
    const agent = storage.createAgent(
      projectId,
      input.name,
      input.cli as Agent['cli'],
      input.cwd || projectData.project.cwd,
      input.role,
      input.flags,
    );
    if (!agent) throw notFound('Project not found');
    return agent;
  }

  updateAgent(projectId: string, agentId: string, updates: AgentUpdate): Agent {
    const agent = storage.updateAgent(projectId, agentId, updates);
    if (!agent) throw notFound('Agent not found');
    return agent;
  }

  async deleteAgent(projectId: string, agentId: string): Promise<void> {
    const agent = storage.getAgent(projectId, agentId);
    try {
      await this.daemon.request('agent:stop', { agentId });
      if (agent) await this.daemon.request('agent:cleanup', { projectId, agentId });
    } catch {
      /* daemon down — agent already not running */
    }
    if (!storage.deleteAgent(projectId, agentId)) throw notFound('Agent not found');
  }

  async teammates(
    projectId: string,
    agentId: string,
  ): Promise<{ self: { id: string; name: string; role?: string }; teammates: Teammate[] }> {
    const all = storage.listAgents(projectId);
    const self = all.find((a) => a.id === agentId);
    if (!self) throw notFound('Agent not found');
    const statuses = await this.agentStatuses();
    return {
      self: { id: self.id, name: self.name, role: self.role },
      teammates: all
        .filter((a) => a.id !== self.id)
        .map((a) => ({
          id: a.id,
          name: a.name,
          role: a.role,
          cli: a.cli,
          status: (statuses[a.id] as AgentStatus) || 'stopped',
        })),
    };
  }

  async startAgent(projectId: string, agentId: string): Promise<void> {
    const agent = storage.getAgent(projectId, agentId);
    if (!agent) throw notFound('Agent not found');
    let ok: boolean;
    try {
      ok = (await this.daemon.request('agent:start', { projectId, agentId: agent.id })).ok;
    } catch (err) {
      throw new ServiceError(503, 'DAEMON_UNAVAILABLE', 'Daemon unavailable: ' + errorText(err));
    }
    if (!ok) throw new ServiceError(500, 'START_FAILED', 'Failed to start agent');
    activity.pushEvent({
      projectId,
      agentId: agent.id,
      agentName: agent.name,
      event: 'agent:started',
      detail: `${agent.name} (${agent.cli}) started`,
    });
    const projectData = storage.getProjectData(projectId);
    if (projectData) activity.watchProject(projectId, projectData.project.name);
  }

  async stopAgent(projectId: string, agentId: string): Promise<void> {
    const agent = storage.getAgent(projectId, agentId);
    if (!agent) throw notFound('Agent not found');
    try {
      await this.daemon.request('agent:stop', { agentId: agent.id });
    } catch {
      /* daemon down — treat as stopped */
    }
    storage.updateAgent(projectId, agentId, { status: 'stopped', pid: undefined });
    this.events.agentStatus(agent.id, 'stopped');
    activity.pushEvent({
      projectId,
      agentId: agent.id,
      agentName: agent.name,
      event: 'agent:stopped',
      detail: `${agent.name} stopped`,
    });
  }

  async restartAgent(projectId: string, agentId: string): Promise<void> {
    const agent = storage.getAgent(projectId, agentId);
    if (!agent) throw notFound('Agent not found');
    try {
      await this.daemon.request('agent:restart', { projectId, agentId: agent.id });
    } catch (err) {
      throw new ServiceError(503, 'DAEMON_UNAVAILABLE', 'Daemon unavailable: ' + errorText(err));
    }
  }

  // ── messaging ──────────────────────────────────────────────────────────

  /** Agent-to-agent message (called by the per-agent MCP server). */
  async sendMessage(projectId: string, input: Partial<MessageInput>): Promise<MessageResult> {
    const { fromAgentId, fromAgentName, target, message } = input;
    if (!fromAgentId || !target || !message) {
      throw badRequest('fromAgentId, target, and message are required');
    }
    const agents = storage.listAgents(projectId);
    const sender = agents.find((a) => a.id === fromAgentId);
    if (!sender) throw notFound('Sender agent not found in this project');

    const recipient = resolveRecipient(agents, sender, String(target));
    const fromName = fromAgentName || sender.name;
    let delivered = false;
    try {
      const r = await this.daemon.request('agent:inject', {
        agentId: recipient.id,
        fromName,
        message: String(message),
      });
      delivered = r.delivered;
    } catch {
      /* daemon down */
    }

    const project = storage.listProjects().find((p) => p.id === projectId);
    if (project) appendTranscript(project.name, fromName, recipient.name, String(message));

    activity.pushEvent({
      projectId,
      agentId: sender.id,
      agentName: sender.name,
      event: 'agent:message',
      detail: `${fromName} → ${recipient.name}: ${String(message).slice(0, 120)}`,
      fromAgent: fromName,
      toAgent: recipient.name,
      message: String(message),
    });

    return { delivered, toAgentId: recipient.id, toAgentName: recipient.name };
  }

  // ── shared content ─────────────────────────────────────────────────────

  listContent(projectId: string): SharedContent[] {
    return storage.listContent(projectId);
  }

  getContent(projectId: string, filename: string): SharedContent {
    const item = storage.getContent(projectId, filename);
    if (!item) throw notFound('Content not found');
    return item;
  }

  createContent(
    projectId: string,
    input: { filename?: string; content?: string; createdBy?: string },
  ): SharedContent {
    if (!input.filename) throw badRequest('filename is required');
    const item = storage.createContent(
      projectId,
      input.filename,
      input.content || '',
      input.createdBy || 'user',
    );
    if (!item) throw notFound('Project not found');
    this.events.contentUpdated(projectId, input.filename);
    return item;
  }

  updateContent(projectId: string, filename: string, content = ''): SharedContent {
    const item = storage.updateContent(projectId, filename, content);
    if (!item) throw notFound('Content not found');
    this.events.contentUpdated(projectId, filename);
    return item;
  }

  deleteContent(projectId: string, filename: string): void {
    if (!storage.deleteContent(projectId, filename)) throw notFound('Content not found');
  }

  // ── activity ───────────────────────────────────────────────────────────

  /** The in-memory activity feed, oldest first; `last` keeps the newest N. */
  activity(projectId?: string, last?: number): ActivityEvent[] {
    const events = activity.getEvents(projectId);
    return last && last > 0 ? events.slice(-last) : events;
  }

  // ── wiki ───────────────────────────────────────────────────────────────

  isWikiInitialized(projectId: string): boolean {
    return storage.isWikiInitialized(projectId);
  }

  initializeWiki(projectId: string): void {
    if (!storage.initializeWiki(projectId)) throw notFound('Project not found');
  }

  listWiki(projectId: string): SharedContent[] {
    return storage.listWikiFiles(projectId);
  }

  getWikiFile(projectId: string, filename: string): SharedContent {
    const item = storage.getWikiFile(projectId, filename);
    if (!item) throw notFound('File not found');
    return item;
  }

  updateWikiFile(projectId: string, filename: string, content = ''): SharedContent {
    const item = storage.updateWikiFile(projectId, filename, content);
    if (!item) throw notFound('File not found');
    return item;
  }
}

/** Match a message target by name (case-insensitive), then by name/role substring. */
function resolveRecipient(agents: Agent[], sender: Agent, target: string): Agent {
  const norm = target.trim().toLowerCase();
  const exact = agents.filter((a) => a.id !== sender.id && a.name.toLowerCase() === norm);
  if (exact.length > 1) {
    throw new ServiceError(
      400,
      'AMBIGUOUS_TARGET',
      `Multiple agents named "${target}" — rename one to disambiguate: ${exact
        .map((a) => `${a.name} (${a.id.slice(0, 8)})`)
        .join(', ')}`,
    );
  }
  if (exact.length === 1) return exact[0];
  const fuzzy = agents.filter(
    (a) =>
      a.id !== sender.id &&
      (a.name.toLowerCase().includes(norm) || (a.role || '').toLowerCase().includes(norm)),
  );
  if (fuzzy.length === 0) throw notFound(`No teammate named "${target}" in this project`);
  if (fuzzy.length > 1) {
    throw new ServiceError(
      400,
      'AMBIGUOUS_TARGET',
      `Ambiguous target "${target}" — matches multiple agents: ${fuzzy.map((a) => a.name).join(', ')}`,
    );
  }
  return fuzzy[0];
}

const errorText = (err: unknown): string => (err instanceof Error ? err.message : String(err));
