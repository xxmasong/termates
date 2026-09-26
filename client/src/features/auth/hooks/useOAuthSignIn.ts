import {
  GithubAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
  type Auth,
  type AuthProvider,
} from 'firebase/auth';
import { useCallback, useState } from 'react';

import { AUTH_COPY } from '../constants';
import type { OAuthProviderId, PendingSignup } from '../types';
import { authErrorMessage, completeSignIn, isInviteError, savePendingSignup } from '../utils';

const providerFor = (id: OAuthProviderId): AuthProvider =>
  id === 'google' ? new GoogleAuthProvider() : new GithubAuthProvider();

export interface OAuthOptions {
  /** Plan / invite to create the account with (signup page). */
  pending?: PendingSignup;
  /** Invite-only site: refuse before opening the popup when no code is given. */
  requireInvite?: boolean;
}

/** Google / GitHub popup sign-in followed by the TermHive session exchange. */
export const useOAuthSignIn = (auth: Auth | null) => {
  const [pendingProvider, setPendingProvider] = useState<OAuthProviderId | null>(null);
  const [error, setError] = useState<string>();
  const [inviteError, setInviteError] = useState<string>();

  const signIn = useCallback(
    async (
      provider: OAuthProviderId,
      { pending = {}, requireInvite = false }: OAuthOptions = {},
    ) => {
      if (!auth) return;
      setError(undefined);
      if (requireInvite && !pending.inviteCode?.trim()) {
        setInviteError(AUTH_COPY.inviteRequired);
        return;
      }
      setInviteError(undefined);
      setPendingProvider(provider);
      try {
        const { user } = await signInWithPopup(auth, providerFor(provider));
        savePendingSignup(pending);
        await completeSignIn(user, pending);
      } catch (reason) {
        setPendingProvider(null);
        const message = authErrorMessage(reason);
        if (isInviteError(reason)) setInviteError(message ?? undefined);
        else if (message) setError(message);
      }
    },
    [auth],
  );

  return { pendingProvider, error, inviteError, signIn };
};
