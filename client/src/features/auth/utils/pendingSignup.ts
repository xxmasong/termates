import { PENDING_SIGNUP_STORAGE_KEY } from '../constants';
import type { PendingSignup } from '../types';

/** sessionStorage can throw (private mode, blocked storage); never let it break sign-in. */
export const savePendingSignup = (pending: PendingSignup): void => {
  try {
    window.sessionStorage.setItem(PENDING_SIGNUP_STORAGE_KEY, JSON.stringify(pending));
  } catch {
    /* The plan falls back to Free server-side. */
  }
};

export const readPendingSignup = (): PendingSignup => {
  try {
    const raw = window.sessionStorage.getItem(PENDING_SIGNUP_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingSignup) : {};
  } catch {
    return {};
  }
};

export const clearPendingSignup = (): void => {
  try {
    window.sessionStorage.removeItem(PENDING_SIGNUP_STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
};
