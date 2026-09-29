import { ApiError } from '@/lib/api';

import { PLAN_LIMIT_CODE } from '../constants';
import type { PlanLimit } from '../types';

const FORBIDDEN = 403;

/** The workspace's 403 {code:'PLAN_LIMIT', kind, limit, used}, or null. */
export const planLimitFromError = (error: unknown): PlanLimit | null => {
  if (!(error instanceof ApiError) || error.status !== FORBIDDEN) return null;
  const body = error.body as Partial<PlanLimit> & { code?: unknown };
  if (body?.code !== PLAN_LIMIT_CODE) return null;
  if ((body.kind !== 'project' && body.kind !== 'agent') || typeof body.limit !== 'number') {
    return null;
  }
  return {
    kind: body.kind,
    limit: body.limit,
    used: typeof body.used === 'number' ? body.used : body.limit,
  };
};
