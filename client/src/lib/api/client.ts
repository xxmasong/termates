import { API_BASE_URL } from '@/constants';

import { ApiError } from './ApiError';

interface ApiRequestOptions<TBody> extends Omit<RequestInit, 'body' | 'headers'> {
  body?: TBody;
  headers?: HeadersInit;
}

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const;

const getErrorMessage = (body: unknown, status: number): string => {
  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as { error: unknown }).error === 'string'
  ) {
    return (body as { error: string }).error;
  }

  return `HTTP ${status}`;
};

const parseJson = async (response: Response): Promise<unknown> => {
  const text = await response.text();

  if (!text) {
    return undefined;
  }

  return JSON.parse(text) as unknown;
};

export const apiRequest = async <TResponse, TBody = undefined>(
  path: string,
  options: ApiRequestOptions<TBody> = {},
): Promise<TResponse> => {
  const { body, headers, ...init } = options;
  const requestHeaders = new Headers(JSON_HEADERS);

  if (headers) {
    new Headers(headers).forEach((value, key) => {
      requestHeaders.set(key, value);
    });
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const responseBody = await parseJson(response);

  if (!response.ok) {
    throw new ApiError(getErrorMessage(responseBody, response.status), response.status, responseBody);
  }

  return responseBody as TResponse;
};
