/**
 * yoga.ts — the workspace's GraphQL endpoint (/graphql). Subscriptions are
 * served over Server-Sent Events, so they pass through the control plane's
 * plain HTTP proxy. Domain errors keep their message and gain
 * `extensions.code`; anything unexpected is masked.
 */

import { GraphQLError } from 'graphql';
import { createYoga, maskError as defaultMaskError, type Plugin } from 'graphql-yoga';

import type { WorkspaceService } from '../services/workspace-service.js';
import { describeError } from '../services/errors.js';
import { createContextFactory } from './context.js';
import { productionRules } from './limits.js';
import type { WorkspacePubSub } from './pubsub.js';
import { schema } from './schema.js';

export const GRAPHQL_PATH = '/graphql';
/** Matches the REST JSON limit: shared files and wiki pages are saved whole. */
export const GRAPHQL_BODY_LIMIT = 10 * 1024 * 1024;

/**
 * Yoga reads request bodies without a size cap. Node's HTTP parser never reads
 * past Content-Length, so bounding the header (and refusing chunked uploads)
 * bounds memory.
 */
const bodyLimitPlugin: Plugin = {
  onRequest({ request, endResponse, fetchAPI }) {
    if (request.method !== 'POST') return;
    const header = request.headers.get('content-length');
    const reject = (status: number, error: string) =>
      endResponse(
        new fetchAPI.Response(JSON.stringify({ errors: [{ message: error }] }), {
          status,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    // A chunked upload has no length to check up front.
    if (header === null) {
      if (request.headers.has('transfer-encoding')) reject(411, 'Content-Length is required.');
      return;
    }
    if (!(Number(header) <= GRAPHQL_BODY_LIMIT)) return reject(413, 'Request body too large.');
  },
};

const limitsPlugin: Plugin = {
  onValidate({ addValidationRule }) {
    for (const rule of productionRules()) addValidationRule(rule);
  },
};

export function createGraphQLHandler(service: WorkspaceService, pubsub: WorkspacePubSub) {
  return createYoga({
    schema,
    graphqlEndpoint: GRAPHQL_PATH,
    context: createContextFactory(service, pubsub),
    graphiql: process.env.NODE_ENV !== 'production',
    landingPage: false,
    plugins: [bodyLimitPlugin, limitsPlugin],
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
