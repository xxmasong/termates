import {
  applyActionCode,
  confirmPasswordReset,
  reload,
  verifyPasswordResetCode,
  type Auth,
} from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';

import { ACTION_COPY, ACTION_MODES, AUTH_ROUTES, WEAK_PASSWORD_MESSAGE } from '../constants';
import { authErrorMessage, completeSignIn, isInviteError } from '../utils';
import { isValidPassword } from './useSignup';

export type AccountActionState =
  | { kind: 'loading' }
  | { kind: 'invalid'; mode: string | null }
  | { kind: 'verified' }
  | { kind: 'reset'; email: string }
  | { kind: 'reset-done' };

const readParams = () => {
  const params = new URLSearchParams(window.location.search);
  return { mode: params.get('mode'), oobCode: params.get('oobCode') };
};

/**
 * Firebase email action links (verifyEmail, resetPassword) land on
 * /account/action?mode=…&oobCode=… — set as the action URL in the console.
 */
export const useAccountAction = (auth: Auth | null) => {
  const [{ mode, oobCode }] = useState(readParams);
  const [state, setState] = useState<AccountActionState>({ kind: 'loading' });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();
  const [confirmError, setConfirmError] = useState<string>();
  const [inviteError, setInviteError] = useState<string>();

  useEffect(() => {
    if (!auth) return undefined;
    if (!oobCode || (mode !== ACTION_MODES.VERIFY_EMAIL && mode !== ACTION_MODES.RESET_PASSWORD)) {
      setState({ kind: 'invalid', mode });
      return undefined;
    }
    let active = true;
    const run =
      mode === ACTION_MODES.VERIFY_EMAIL
        ? applyActionCode(auth, oobCode).then((): AccountActionState => ({ kind: 'verified' }))
        : verifyPasswordResetCode(auth, oobCode).then((email): AccountActionState => ({
            kind: 'reset',
            email,
          }));
    run
      .then((next) => active && setState(next))
      .catch(() => active && setState({ kind: 'invalid', mode }));
    return () => {
      active = false;
    };
  }, [auth, mode, oobCode]);

  /** After verifying: finish sign-in in this browser, or go sign in. */
  const continueToApp = useCallback(
    async (inviteCode: string) => {
      const user = auth?.currentUser;
      if (!user) {
        window.location.assign(AUTH_ROUTES.LOGIN);
        return;
      }
      setPending(true);
      setError(undefined);
      try {
        await reload(user);
        await completeSignIn(user, inviteCode.trim() ? { inviteCode: inviteCode.trim() } : {});
      } catch (reason) {
        setPending(false);
        const message = authErrorMessage(reason) ?? undefined;
        if (isInviteError(reason)) setInviteError(message);
        else setError(message);
      }
    },
    [auth],
  );

  const resetPassword = useCallback(
    async (email: string, password: string, confirmation: string) => {
      const weak = isValidPassword(password, email) ? undefined : WEAK_PASSWORD_MESSAGE;
      const mismatch = password === confirmation ? undefined : ACTION_COPY.passwordsDontMatch;
      setPasswordError(weak);
      setConfirmError(mismatch);
      if (weak || mismatch || !auth || !oobCode) return;
      setPending(true);
      setError(undefined);
      try {
        await confirmPasswordReset(auth, oobCode, password);
        setState({ kind: 'reset-done' });
      } catch (reason) {
        setError(authErrorMessage(reason) ?? undefined);
      } finally {
        setPending(false);
      }
    },
    [auth, oobCode],
  );

  return {
    state,
    pending,
    error,
    passwordError,
    confirmError,
    inviteError,
    continueToApp,
    resetPassword,
  };
};
