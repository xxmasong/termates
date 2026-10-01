import { builder } from './builder.js';
import { AgentCliEnum, AgentRef, DocRef, MessageResultRef, ProjectRef } from './types.js';

const CreateProjectInput = builder.inputType('CreateProjectInput', {
  fields: (t) => ({
    name: t.string({ required: true }),
    cwd: t.string({ required: true }),
    description: t.string(),
  }),
});

const UpdateProjectInput = builder.inputType('UpdateProjectInput', {
  fields: (t) => ({
    name: t.string(),
    cwd: t.string(),
    description: t.string(),
  }),
});

const CreateAgentInput = builder.inputType('CreateAgentInput', {
  fields: (t) => ({
    projectId: t.id({ required: true }),
    name: t.string({ required: true }),
    cli: t.field({ type: AgentCliEnum, required: true }),
    cwd: t.string(),
    role: t.string(),
    remoteControl: t.boolean(),
  }),
});

const UpdateAgentInput = builder.inputType('UpdateAgentInput', {
  fields: (t) => ({
    name: t.string(),
    role: t.string(),
    cwd: t.string(),
    model: t.string(),
    effort: t.string(),
    thinking: t.string(),
    permissionMode: t.string(),
    autocompact: t.string(),
  }),
});

const SendMessageInput = builder.inputType('SendMessageInput', {
  fields: (t) => ({
    projectId: t.id({ required: true }),
    fromAgentId: t.id({ required: true }),
    fromAgentName: t.string(),
    target: t.string({ required: true }),
    message: t.string({ required: true }),
  }),
});

/** Drop unset (null/undefined) fields so partial updates don't clear values. */
const defined = <T extends Record<string, unknown>>(input: T) =>
  Object.fromEntries(Object.entries(input).filter(([, v]) => v !== null && v !== undefined)) as {
    [K in keyof T]?: NonNullable<T[K]>;
  };

builder.mutationFields((t) => ({
  createProject: t.field({
    type: ProjectRef,
    args: { input: t.arg({ type: CreateProjectInput, required: true }) },
    resolve: (_root, { input }, ctx) =>
      ctx.service.createProject({
        name: input.name,
        cwd: input.cwd,
        description: input.description ?? undefined,
      }),
  }),
  updateProject: t.field({
    type: ProjectRef,
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: UpdateProjectInput, required: true }),
    },
    resolve: (_root, args, ctx) => ctx.service.updateProject(String(args.id), defined(args.input)),
  }),
  deleteProject: t.boolean({
    args: { id: t.arg.id({ required: true }), removeData: t.arg.boolean() },
    resolve: (_root, args, ctx) => {
      ctx.service.deleteProject(String(args.id), args.removeData ?? false);
      return true;
    },
  }),

  createAgent: t.field({
    type: AgentRef,
    args: { input: t.arg({ type: CreateAgentInput, required: true }) },
    resolve: (_root, { input }, ctx) =>
      ctx.service.createAgent(String(input.projectId), {
        name: input.name,
        cli: input.cli,
        cwd: input.cwd ?? undefined,
        role: input.role ?? undefined,
        flags: input.remoteControl ? { remoteControl: true } : undefined,
      }),
  }),
  updateAgent: t.field({
    type: AgentRef,
    args: {
      projectId: t.arg.id({ required: true }),
      id: t.arg.id({ required: true }),
      input: t.arg({ type: UpdateAgentInput, required: true }),
    },
    resolve: (_root, args, ctx) =>
      ctx.service.updateAgent(String(args.projectId), String(args.id), defined(args.input)),
  }),
  deleteAgent: t.boolean({
    args: { projectId: t.arg.id({ required: true }), id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      await ctx.service.deleteAgent(String(args.projectId), String(args.id));
      return true;
    },
  }),
  startAgent: lifecycle(t, 'startAgent'),
  stopAgent: lifecycle(t, 'stopAgent'),
  restartAgent: lifecycle(t, 'restartAgent'),

  sendMessage: t.field({
    type: MessageResultRef,
    args: { input: t.arg({ type: SendMessageInput, required: true }) },
    resolve: (_root, { input }, ctx) =>
      ctx.service.sendMessage(String(input.projectId), {
        fromAgentId: String(input.fromAgentId),
        fromAgentName: input.fromAgentName ?? undefined,
        target: input.target,
        message: input.message,
      }),
  }),

  createSharedFile: t.field({
    type: DocRef,
    args: {
      projectId: t.arg.id({ required: true }),
      filename: t.arg.string({ required: true }),
      content: t.arg.string(),
    },
    resolve: (_root, args, ctx) =>
      ctx.service.createContent(String(args.projectId), {
        filename: args.filename,
        content: args.content ?? '',
      }),
  }),
  saveSharedFile: t.field({
    type: DocRef,
    args: {
      projectId: t.arg.id({ required: true }),
      filename: t.arg.string({ required: true }),
      content: t.arg.string({ required: true }),
    },
    resolve: (_root, args, ctx) =>
      ctx.service.updateContent(String(args.projectId), args.filename, args.content),
  }),
  deleteSharedFile: t.boolean({
    args: { projectId: t.arg.id({ required: true }), filename: t.arg.string({ required: true }) },
    resolve: (_root, args, ctx) => {
      ctx.service.deleteContent(String(args.projectId), args.filename);
      return true;
    },
  }),

  initializeWiki: t.boolean({
    args: { projectId: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => {
      ctx.service.initializeWiki(String(args.projectId));
      return true;
    },
  }),
  saveWikiPage: t.field({
    type: DocRef,
    args: {
      projectId: t.arg.id({ required: true }),
      filename: t.arg.string({ required: true }),
      content: t.arg.string({ required: true }),
    },
    resolve: (_root, args, ctx) =>
      ctx.service.updateWikiFile(String(args.projectId), args.filename, args.content),
  }),
}));

function lifecycle(
  t: Parameters<Parameters<typeof builder.mutationFields>[0]>[0],
  action: 'startAgent' | 'stopAgent' | 'restartAgent',
) {
  return t.field({
    type: AgentRef,
    args: { projectId: t.arg.id({ required: true }), id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const projectId = String(args.projectId);
      const id = String(args.id);
      await ctx.service[action](projectId, id);
      const agent = await ctx.service.getAgent(projectId, id);
      if (!agent) throw new Error('Agent disappeared');
      return agent;
    },
  });
}
