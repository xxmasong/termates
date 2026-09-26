import { ApiError } from '@/lib/api';

import { ACCOUNT_API } from '../constants';
import type { Me } from '../types';

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
