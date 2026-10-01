/**
 * errors.ts — the workspace's domain errors, shared by REST and GraphQL.
 *
 * A ServiceError carries an HTTP status for REST and a stable `code` that the
 * GraphQL layer exposes as `extensions.code`.
 */

import { CwdOutsideHomeError, PlanLimitError } from '../workspace-limits.js';

export type ServiceErrorCode =
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'DAEMON_UNAVAILABLE'
  | 'START_FAILED'
  | 'AMBIGUOUS_TARGET';

export class ServiceError extends Error {
  constructor(
    readonly status: number,
    readonly code: ServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ServiceError';
  }

  toJSON() {
    return { error: this.message, code: this.code };
  }
}

export const badRequest = (message: string) => new ServiceError(400, 'BAD_REQUEST', message);
export const notFound = (message: string) => new ServiceError(404, 'NOT_FOUND', message);

/** Any error a service may throw on purpose, with its HTTP status and JSON body. */
export function describeError(
  err: unknown,
): { status: number; body: Record<string, unknown>; code: string } | null {
  if (err instanceof ServiceError) return { status: err.status, body: err.toJSON(), code: err.code };
  if (err instanceof PlanLimitError) return { status: 403, body: err.toJSON(), code: err.code };
  if (err instanceof CwdOutsideHomeError) return { status: 400, body: err.toJSON(), code: err.code };
  return null;
}
