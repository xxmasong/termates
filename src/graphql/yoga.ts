/**
 * yoga.ts — the workspace's GraphQL endpoint (/graphql). Subscriptions are
 * served over Server-Sent Events, so they pass through the control plane's
 * plain HTTP proxy. Domain errors keep their message and gain
 * `extensions.code`; anything unexpected is masked.
 */

import { GraphQLError } from 'graphql';
import { createYoga, maskError as defaultMaskError } from 'graphql-yoga';

import type { WorkspaceService } from '../services/workspace-service.js';
import { describeError } from '../services/errors.js';
import { createContextFactory } from './context.js';
import type { WorkspacePubSub } from './pubsub.js';
import { schema } from './schema.js';

export const GRAPHQL_PATH = '/graphql';

export function createGraphQLHandler(service: WorkspaceService, pubsub: WorkspacePubSub) {
  return createYoga({
    schema,
    graphqlEndpoint: GRAPHQL_PATH,
    context: createContextFactory(service, pubsub),
    graphiql: process.env.NODE_ENV !== 'production',
    landingPage: false,
    maskedErrors: {
      maskError(error, message, isDev) {
        const original = error instanceof GraphQLError ? error.originalError : error;
        const known = describeError(original);
        if (known && error instanceof GraphQLError) {
          return new GraphQLError(known.body.error as string, {
            nodes: error.nodes,
            path: error.path,
            extensions: { ...known.body, http: { status: 200 }, status: known.status },
          });
        }
        return defaultMaskError(error, message, isDev);
      },
    },
  });
}
