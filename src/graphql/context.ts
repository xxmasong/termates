import type { WorkspaceService } from '../services/workspace-service.js';
import type { WorkspacePubSub } from './pubsub.js';

export interface GraphQLContext {
  service: WorkspaceService;
  pubsub: WorkspacePubSub;
  /** Daemon statuses, fetched at most once per request (DataLoader-style). */
  statuses: () => Promise<Record<string, string>>;
}

export const createContextFactory =
  (service: WorkspaceService, pubsub: WorkspacePubSub) => (): GraphQLContext => {
    let cached: Promise<Record<string, string>> | null = null;
    return {
      service,
      pubsub,
      statuses: () => (cached ??= service.agentStatuses()),
    };
  };
