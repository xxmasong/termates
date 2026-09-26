import {
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  type Auth,
  type User,
} from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';

import { RESEND_COOLDOWN_SECONDS, VERIFY_COPY } from '../constants';
import { authErrorMessage, completeSignIn, isInviteError } from '../utils';
import { useCooldown } from './useCooldown';

export type VerifySessionState = 'checking' | 'signed-in' | 'signed-out';

/**
 * The "check your inbox" page: resend the Firebase verification email and,
 * once the link was clicked, reload the user and exchange the session.
 */
export const useVerifyEmail = (auth: Auth | null) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<VerifySessionState>('checking');
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [inviteError, setInviteError] = useState<string>();
  const cooldown = useCooldown(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setSession(next ? 'signed-in' : 'signed-out');
    });
  }, [auth]);

  const { start: startCooldown } = cooldown;
  const resend = useCallback(async () => {
    if (!user) return;
    setError(undefined);
    try {
      await sendEmailVerification(user);
      setSent(true);
      startCooldown();
    } catch (reason) {
      setError(authErrorMessage(reason) ?? undefined);
    }
  }, [startCooldown, user]);

  const confirm = useCallback(
    async (inviteCode: string) => {
      if (!user) return;
      setPending(true);
      setError(undefined);
      try {
        await reload(user);
        if (!user.emailVerified) {
          setError(VERIFY_COPY.notYetVerified);
          setPending(false);
          return;
        }
        await completeSignIn(user, inviteCode.trim() ? { inviteCode: inviteCode.trim() } : {});
      } catch (reason) {
        setPending(false);
        const message = authErrorMessage(reason) ?? undefined;
        if (isInviteError(reason)) setInviteError(message);
        else setError(message);
      }
    },
    [user],
  );

  return {
    email: user?.email ?? null,
    session,
    sent,
    pending,
    error,
    inviteError,
    cooldownSeconds: cooldown.remaining,
    resend,
    confirm,
  };
};
