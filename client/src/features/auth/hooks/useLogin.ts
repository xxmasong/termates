import { signInWithEmailAndPassword, type Auth } from 'firebase/auth';
import { useCallback, useState } from 'react';

import { AUTH_ROUTES, FIELD_REQUIRED } from '../constants';
import type { FieldErrors } from '../types';
import { authErrorMessage, completeSignIn, errorCode, isInviteError } from '../utils';

/** Email + password sign-in: Firebase first, then the TermHive session. */
export const useLogin = (auth: Auth | null, navigate: (path: string) => void) => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [fields, setFields] = useState<FieldErrors>({});
  const [inviteRequired, setInviteRequired] = useState(false);

  const submit = useCallback(
    async (email: string, password: string, inviteCode: string) => {
      const next: FieldErrors = {};
      if (!email) next.email = FIELD_REQUIRED.email;
      if (!password) next.password = FIELD_REQUIRED.password;
      if (inviteRequired && !inviteCode.trim()) next.inviteCode = FIELD_REQUIRED.inviteCode;
      setFields(next);
      if (Object.keys(next).length || !auth) return;

      setPending(true);
      setError(undefined);
      try {
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        if (!user.emailVerified) {
          navigate(`${AUTH_ROUTES.VERIFY}?email=${encodeURIComponent(email)}`);
          return;
        }
        await completeSignIn(user, inviteCode.trim() ? { inviteCode: inviteCode.trim() } : {});
      } catch (reason) {
        setPending(false);
        if (errorCode(reason) === 'EMAIL_UNVERIFIED') {
          navigate(`${AUTH_ROUTES.VERIFY}?email=${encodeURIComponent(email)}`);
          return;
        }
        if (isInviteError(reason)) {
          setInviteRequired(true);
          setFields({ inviteCode: authErrorMessage(reason) ?? undefined });
          return;
        }
        setError(authErrorMessage(reason) ?? undefined);
      }
    },
    [auth, inviteRequired, navigate],
  );

  return { pending, error, fields, inviteRequired, submit };
};
