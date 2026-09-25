import { useCallback, useState } from 'react';
import { login } from '../api/authApi';
import { AUTH_COPY } from '../constants';
import type { AuthError, FieldErrors } from '../types';
const messages: Partial<Record<string, string>> = {
  INVALID_CREDENTIALS: "That email and password don't match.",
  EMAIL_UNVERIFIED: 'Please verify your email first.',
  RATE_LIMITED: 'Too many attempts. Try again in a few minutes.',
};
export const useLogin = () => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [fields, setFields] = useState<FieldErrors>({});
  const submit = useCallback(async (email: string, password: string) => {
    const next: FieldErrors = {};
    if (!email) next.email = 'Email is required.';
    if (!password) next.password = 'Password is required.';
    setFields(next);
    if (Object.keys(next).length) return;
    setPending(true);
    setError(undefined);
    try {
      await login(email, password);
      window.location.assign('/app');
    } catch (reason) {
      const authError = reason as AuthError;
      setError(messages[authError.code ?? ''] ?? AUTH_COPY.genericError);
    } finally {
      setPending(false);
    }
  }, []);
  return { pending, error, fields, submit };
};
