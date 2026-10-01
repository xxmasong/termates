/**
 * pubsub.ts — in-process event channels behind GraphQL subscriptions.
 * server.ts publishes the same events it pushes over the legacy WebSocket.
 */

import { createPubSub } from 'graphql-yoga';

import type { ActivityEvent } from '../types.js';

export interface AgentStatusEvent {
  agentId: string;
  status: string;
}

export interface ContentUpdatedEvent {
  projectId: string;
  filename: string;
}

export type WorkspacePubSub = ReturnType<typeof createWorkspacePubSub>;

export const createWorkspacePubSub = () =>
  createPubSub<{
    agentStatus: [AgentStatusEvent];
    activity: [ActivityEvent];
    contentUpdated: [ContentUpdatedEvent];
    orgChanged: [true];
  }>();
