import { builder } from './builder.js';
import { ActivityEventRef, AgentRef, DocRef, ProjectRef } from './types.js';

builder.queryFields((t) => ({
  projects: t.field({
    type: [ProjectRef],
    resolve: (_root, _args, ctx) => ctx.service.listProjects(),
  }),
  project: t.field({
    type: ProjectRef,
    nullable: true,
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => ctx.service.getProject(String(args.id)),
  }),
  agent: t.field({
    type: AgentRef,
    nullable: true,
    args: { projectId: t.arg.id({ required: true }), id: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => ctx.service.getAgent(String(args.projectId), String(args.id)),
  }),
  sharedFile: t.field({
    type: DocRef,
    args: { projectId: t.arg.id({ required: true }), filename: t.arg.string({ required: true }) },
    resolve: (_root, args, ctx) => ctx.service.getContent(String(args.projectId), args.filename),
  }),
  wikiPage: t.field({
    type: DocRef,
    args: { projectId: t.arg.id({ required: true }), filename: t.arg.string({ required: true }) },
    resolve: (_root, args, ctx) => ctx.service.getWikiFile(String(args.projectId), args.filename),
  }),
  activity: t.field({
    type: [ActivityEventRef],
    args: { projectId: t.arg.id({ required: false }), last: t.arg.int({ required: false }) },
    resolve: (_root, args, ctx) =>
      ctx.service.activity(args.projectId ? String(args.projectId) : undefined, args.last ?? undefined),
  }),
}));
