import {
  AUTH_COPY,
  FIREBASE_ERROR_MESSAGES,
  INVITE_ERROR_CODES,
  SESSION_ERROR_MESSAGES,
  SILENT_FIREBASE_ERRORS,
} from '../constants';

/** The code of a Firebase error (`auth/...`) or an /auth/session error. */
export const errorCode = (error: unknown): string | undefined => {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const { code } = error as { code: unknown };
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
};

/** User-facing message for any sign-in failure; null when it should stay silent. */
export const authErrorMessage = (error: unknown): string | null => {
  const code = errorCode(error);
  if (!code) return AUTH_COPY.genericError;
  if (SILENT_FIREBASE_ERRORS.includes(code)) return null;
  return FIREBASE_ERROR_MESSAGES[code] ?? SESSION_ERROR_MESSAGES[code] ?? AUTH_COPY.genericError;
};

export const isInviteError = (error: unknown): boolean =>
  INVITE_ERROR_CODES.includes(errorCode(error) ?? '');
