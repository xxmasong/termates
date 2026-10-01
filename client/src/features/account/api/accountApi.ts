import { ApiError } from '@/lib/api';

import { ACCOUNT_API } from '../constants';
import type { Me, PlanUsage } from '../types';
import type { PlanId } from '@/constants';

const UNAUTHORIZED = 401;

/** GET /auth/me — null when there is no session. */
export const fetchMe = async (): Promise<Me | null> => {
  const response = await fetch(ACCOUNT_API.ME, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });
  if (response.status === UNAUTHORIZED) return null;
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) throw new ApiError(`HTTP ${response.status}`, response.status, body);
  return body as Me;
};

/** POST /auth/logout */
export const logout = async (): Promise<void> => {
  await fetch(ACCOUNT_API.LOGOUT, { method: 'POST', credentials: 'same-origin' });
};

const readJson = async <T>(response: Response): Promise<T> => {
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) throw new ApiError(`HTTP ${response.status}`, response.status, body);
  return body as T;
};

/** GET /auth/usage — projects and agents in the user's workspace. */
export const fetchUsage = async (): Promise<PlanUsage> =>
  readJson<PlanUsage>(
    await fetch(ACCOUNT_API.USAGE, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    }),
  );

/** POST /auth/plan — self-serve plan change; returns the updated /auth/me. */
export const changePlan = async (plan: PlanId): Promise<Me> =>
  readJson<Me>(
    await fetch(ACCOUNT_API.PLAN, {
      body: JSON.stringify({ plan }),
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    }),
  );

/** POST /auth/logout-all — ends every session of this account. */
export const logoutEverywhere = async (): Promise<void> => {
  await fetch(ACCOUNT_API.LOGOUT_ALL, { method: 'POST', credentials: 'same-origin' });
};
