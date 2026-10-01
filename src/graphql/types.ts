/**
 * types.ts — GraphQL object types over the workspace's domain objects.
 */

import type { MessageResult, Teammate } from '../services/workspace-service.js';
import type { ActivityEvent, Agent, Project, SharedContent } from '../types.js';
import { builder } from './builder.js';

export const AgentStatusEnum = builder.enumType('AgentStatus', {
  values: {
    STOPPED: { value: 'stopped' },
    RUNNING: { value: 'running' },
    IDLE: { value: 'idle' },
    AWAITING_INPUT: { value: 'awaiting_input' },
  } as const,
});

export const AgentCliEnum = builder.enumType('AgentCli', {
  values: {
    CLAUDE: { value: 'claude' },
    CODEX: { value: 'codex' },
    GEMINI: { value: 'gemini' },
  } as const,
});

const statusOf = (status: string | undefined): Agent['status'] =>
  status === 'running' || status === 'idle' || status === 'awaiting_input' ? status : 'stopped';

export const DocRef = builder.objectRef<SharedContent>('Doc').implement({
  description: 'A shared file or wiki page.',
  fields: (t) => ({
    id: t.exposeID('id'),
    projectId: t.exposeID('projectId'),
    filename: t.exposeString('filename'),
    content: t.exposeString('content'),
    createdBy: t.exposeString('createdBy'),
    updatedAt: t.exposeString('updatedAt'),
  }),
});

export const TeammateRef = builder.objectRef<Teammate>('Teammate').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    role: t.string({ nullable: true, resolve: (m) => m.role ?? null }),
    cli: t.field({ type: AgentCliEnum, resolve: (m) => m.cli }),
    status: t.field({ type: AgentStatusEnum, resolve: (m) => statusOf(m.status) }),
  }),
});

export const AgentRef = builder.objectRef<Agent>('Agent').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    projectId: t.exposeID('projectId'),
    name: t.exposeString('name'),
    role: t.string({ nullable: true, resolve: (a) => a.role ?? null }),
    cli: t.field({ type: AgentCliEnum, resolve: (a) => a.cli }),
    cwd: t.exposeString('cwd'),
    status: t.field({
      type: AgentStatusEnum,
      description: 'Live status from the daemon.',
      resolve: async (a, _args, ctx) => statusOf((await ctx.statuses())[a.id]),
    }),
    model: t.string({ nullable: true, resolve: (a) => a.model ?? null }),
    effort: t.string({ nullable: true, resolve: (a) => a.effort ?? null }),
    thinking: t.string({ nullable: true, resolve: (a) => a.thinking ?? null }),
    permissionMode: t.string({ nullable: true, resolve: (a) => a.permissionMode ?? null }),
    autocompact: t.string({ nullable: true, resolve: (a) => a.autocompact ?? null }),
    remoteControl: t.boolean({ resolve: (a) => Boolean(a.flags?.remoteControl) }),
    preview: t.string({
      description: 'The last lines of the terminal.',
      resolve: (a, _args, ctx) => ctx.service.preview(a.id),
    }),
    teammates: t.field({
      type: [TeammateRef],
      resolve: async (a, _args, ctx) => (await ctx.service.teammates(a.projectId, a.id)).teammates,
    }),
  }),
});

export const ActivityEventRef = builder.objectRef<ActivityEvent>('ActivityEvent').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    projectId: t.exposeID('projectId'),
    agentId: t.string({ nullable: true, resolve: (e) => e.agentId ?? null }),
    agentName: t.string({ nullable: true, resolve: (e) => e.agentName ?? null }),
    event: t.exposeString('event'),
    detail: t.exposeString('detail'),
    timestamp: t.exposeString('timestamp'),
    fromAgent: t.string({ nullable: true, resolve: (e) => e.fromAgent ?? null }),
    toAgent: t.string({ nullable: true, resolve: (e) => e.toAgent ?? null }),
    message: t.string({ nullable: true, resolve: (e) => e.message ?? null }),
  }),
});

export const ProjectRef = builder.objectRef<Project>('Project').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    description: t.string({ nullable: true, resolve: (p) => p.description ?? null }),
    cwd: t.exposeString('cwd'),
    createdAt: t.exposeString('createdAt'),
    agents: t.field({
      type: [AgentRef],
      resolve: async (p, _args, ctx) => ctx.service.listAgents(p.id, await ctx.statuses()),
    }),
    agentCount: t.int({
      resolve: async (p, _args, ctx) => (await ctx.service.listAgents(p.id, {})).length,
    }),
    sharedFiles: t.field({ type: [DocRef], resolve: (p, _args, ctx) => ctx.service.listContent(p.id) }),
    wikiInitialized: t.boolean({ resolve: (p, _args, ctx) => ctx.service.isWikiInitialized(p.id) }),
    wiki: t.field({ type: [DocRef], resolve: (p, _args, ctx) => ctx.service.listWiki(p.id) }),
    activity: t.field({
      type: [ActivityEventRef],
      args: { last: t.arg.int({ required: false }) },
      resolve: (p, args, ctx) => ctx.service.activity(p.id, args.last ?? undefined),
    }),
  }),
});

export const MessageResultRef = builder.objectRef<MessageResult>('MessageResult').implement({
  fields: (t) => ({
    delivered: t.exposeBoolean('delivered'),
    toAgentId: t.exposeID('toAgentId'),
    toAgentName: t.exposeString('toAgentName'),
  }),
});

export const AgentStatusEventRef = builder
  .objectRef<{ agentId: string; status: string }>('AgentStatusEvent')
  .implement({
    fields: (t) => ({
      agentId: t.exposeID('agentId'),
      status: t.field({ type: AgentStatusEnum, resolve: (e) => statusOf(e.status) }),
    }),
  });

export const ContentUpdatedEventRef = builder
  .objectRef<{ projectId: string; filename: string }>('ContentUpdatedEvent')
  .implement({
    fields: (t) => ({
      projectId: t.exposeID('projectId'),
      filename: t.exposeString('filename'),
    }),
  });
