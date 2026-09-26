import { useCallback, useState } from 'react';
import { forgotPassword, resetPassword } from '../api/authApi';
import { AUTH_COPY } from '../constants';
export const useForgotPassword = () => {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = useCallback(async (email: string) => {
    setPending(true);
    try {
      await forgotPassword(email);
    } catch {
      /* Always show the privacy-preserving success state. */
    } finally {
      setPending(false);
      setSent(true);
    }
  }, []);
  return { pending, sent, submit };
};
export const useResetPassword = () => {
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>();
  const submit = useCallback(async (token: string, password: string) => {
    setPending(true);
    setError(undefined);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch {
      setError(AUTH_COPY.genericError);
    } finally {
      setPending(false);
    }
  }, []);
  return { pending, success, error, submit };
};
