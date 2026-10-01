import { filter, pipe } from 'graphql-yoga';

import { builder } from './builder.js';
import { ActivityEventRef, AgentStatusEventRef, ContentUpdatedEventRef } from './types.js';

builder.subscriptionFields((t) => ({
  agentStatus: t.field({
    type: AgentStatusEventRef,
    description: 'Every agent status change in this workspace.',
    subscribe: (_root, _args, ctx) => ctx.pubsub.subscribe('agentStatus'),
    resolve: (event) => event,
  }),
  activity: t.field({
    type: ActivityEventRef,
    args: { projectId: t.arg.id({ required: false }) },
    subscribe: (_root, args, ctx) =>
      pipe(
        ctx.pubsub.subscribe('activity'),
        filter((event) => !args.projectId || event.projectId === String(args.projectId)),
      ),
    resolve: (event) => event,
  }),
  contentUpdated: t.field({
    type: ContentUpdatedEventRef,
    args: { projectId: t.arg.id({ required: false }) },
    subscribe: (_root, args, ctx) =>
      pipe(
        ctx.pubsub.subscribe('contentUpdated'),
        filter((event) => !args.projectId || event.projectId === String(args.projectId)),
      ),
    resolve: (event) => event,
  }),
  orgChanged: t.boolean({
    description: 'Projects or agents were created or changed (e.g. by the Keeper).',
    subscribe: (_root, _args, ctx) => ctx.pubsub.subscribe('orgChanged'),
    resolve: () => true,
  }),
}));
