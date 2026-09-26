import { useCallback, useState } from 'react';
import { resetPassword } from '../api/authApi';
import { AUTH_COPY } from '../constants';
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
