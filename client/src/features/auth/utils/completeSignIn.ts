import type { User } from 'firebase/auth';

import { exchangeSession } from '../api/sessionApi';
import { AUTH_ROUTES } from '../constants';
import type { PendingSignup } from '../types';
import { clearPendingSignup, readPendingSignup } from './pendingSignup';

/**
 * Exchange the signed-in Firebase user for a TermHive session and open the
 * app. Plan / invite come from signup (sessionStorage) unless overridden.
 * Throws the /auth/session error on failure.
 */
export const completeSignIn = async (user: User, override: PendingSignup = {}): Promise<void> => {
  const pending = { ...readPendingSignup(), ...override };
  const idToken = await user.getIdToken(true);
  await exchangeSession(idToken, pending);
  clearPendingSignup();
  window.location.assign(AUTH_ROUTES.APP);
};
