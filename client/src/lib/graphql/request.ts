import { ApiError } from '@/lib/api';

import { GRAPHQL_ENDPOINT, GRAPHQL_FALLBACK_STATUS } from './constants';
import type { TypedDocumentString } from './generated/graphql';

interface GraphQLErrorPayload {
  message: string;
  extensions?: Record<string, unknown> & { status?: number };
}

interface GraphQLResponse<TData> {
  data?: TData | null;
  errors?: GraphQLErrorPayload[];
}

/**
 * Run a typed operation against the workspace's /graphql. The first error is
 * raised as an ApiError shaped like the REST one (status + `{error, code, …}`
 * body), so existing handlers — e.g. the PLAN_LIMIT upgrade dialog — work
 * unchanged.
 */
export const gqlRequest = async <TResult, TVariables>(
  document: TypedDocumentString<TResult, TVariables>,
  ...[variables]: TVariables extends Record<string, never> ? [] : [TVariables]
): Promise<TResult> => {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    body: JSON.stringify({ query: document.toString(), variables }),
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    method: 'POST',
  });
  const payload = (await response.json().catch(() => undefined)) as
    GraphQLResponse<TResult> | undefined;

  const error = payload?.errors?.[0];
  if (error) {
    const status = error.extensions?.status ?? GRAPHQL_FALLBACK_STATUS;
    throw new ApiError(error.message, status, { error: error.message, ...error.extensions });
  }
  if (!response.ok || !payload?.data) {
    throw new ApiError(`HTTP ${response.status}`, response.status, payload);
  }
  return payload.data;
};
