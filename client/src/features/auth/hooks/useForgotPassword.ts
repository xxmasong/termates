import { sendPasswordResetEmail, type Auth } from 'firebase/auth';
import { useCallback, useState } from 'react';

import { FIELD_REQUIRED } from '../constants';
import { authErrorMessage, errorCode } from '../utils';

/** Errors worth showing; anything else still shows the neutral success state. */
const SHOWN_ERRORS: readonly string[] = ['auth/invalid-email', 'auth/too-many-requests'];

/** Firebase sends the reset email; the page never reveals whether the account exists. */
export const useForgotPassword = (auth: Auth | null) => {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();

  const submit = useCallback(
    async (email: string) => {
      if (!email) {
        setError(FIELD_REQUIRED.email);
        return;
      }
      if (!auth) return;
      setPending(true);
      setError(undefined);
      try {
        await sendPasswordResetEmail(auth, email);
        setSent(true);
      } catch (reason) {
        if (SHOWN_ERRORS.includes(errorCode(reason) ?? '')) {
          setError(authErrorMessage(reason) ?? undefined);
        } else {
          setSent(true);
        }
      } finally {
        setPending(false);
      }
    },
    [auth],
  );

  return { pending, sent, error, submit };
};
