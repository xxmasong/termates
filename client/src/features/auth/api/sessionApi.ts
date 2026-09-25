import { AUTH_API } from '../constants';
import type { AuthConfig, AuthError, PendingSignup } from '../types';

const UNCONFIGURED: AuthConfig = { configured: false, signupMode: 'open' };

/** GET /auth/config. An unreachable control plane reads as "not configured". */
export const fetchAuthConfig = async (): Promise<AuthConfig> => {
  try {
    const response = await fetch(AUTH_API.CONFIG, { credentials: 'same-origin' });
    if (!response.ok) return UNCONFIGURED;
    const body = (await response.json()) as Partial<AuthConfig>;
    return body.configured === true || body.configured === false
      ? (body as AuthConfig)
      : UNCONFIGURED;
  } catch {
    return UNCONFIGURED;
  }
};

/** POST /auth/session — trade a Firebase ID token for the th_session cookie. */
export const exchangeSession = async (idToken: string, pending: PendingSignup): Promise<void> => {
  const response = await fetch(AUTH_API.SESSION, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, ...pending }),
  });
  if (!response.ok) {
    throw (await response.json().catch(() => ({ error: 'Request failed.' }))) as AuthError;
  }
};
