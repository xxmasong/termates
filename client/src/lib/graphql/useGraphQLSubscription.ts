import { useEffect, useRef } from 'react';

import { GRAPHQL_ENDPOINT, SUBSCRIPTION_RETRY_MS } from './constants';
import type { TypedDocumentString } from './generated/graphql';

/**
 * Subscribe over Server-Sent Events (GraphQL Yoga's default transport).
 * `onData` may change between renders without resubscribing. Streams that
 * error are retried after a short delay; unmount closes them.
 */
export const useGraphQLSubscription = <TResult, TVariables>(
  document: TypedDocumentString<TResult, TVariables>,
  onData: (data: TResult) => void,
  variables?: TVariables,
): void => {
  const handler = useRef(onData);
  handler.current = onData;
  const query = document.toString();
  const vars = variables ? JSON.stringify(variables) : '';

  useEffect(() => {
    let source: EventSource | null = null;
    let retry: number | undefined;
    let closed = false;

    const open = () => {
      const params = new URLSearchParams({ query });
      if (vars) params.set('variables', vars);
      source = new EventSource(`${GRAPHQL_ENDPOINT}?${params.toString()}`, {
        withCredentials: true,
      });
      source.addEventListener('next', (event) => {
        const payload = JSON.parse((event as MessageEvent<string>).data) as { data?: TResult };
        if (payload.data) handler.current(payload.data);
      });
      source.addEventListener('error', () => {
        source?.close();
        if (!closed) retry = window.setTimeout(open, SUBSCRIPTION_RETRY_MS);
      });
    };

    open();
    return () => {
      closed = true;
      window.clearTimeout(retry);
      source?.close();
    };
  }, [query, vars]);
};
