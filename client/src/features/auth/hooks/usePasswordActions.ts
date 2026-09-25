import { useCallback, useEffect, useState } from 'react';
import { forgotPassword, resendVerification, resetPassword } from '../api/authApi';
import { AUTH_COPY, RESEND_COOLDOWN_SECONDS } from '../constants';
export const useResendVerification = () => {
  const [seconds, setSeconds] = useState(0);
  const [sent, setSent] = useState(false);
  const resend = useCallback(async (email: string) => {
    try {
      await resendVerification(email);
      setSent(true);
      setSeconds(RESEND_COOLDOWN_SECONDS);
    } catch {
      /* Retry remains available. */
    }
  }, []);
  useEffect(() => {
    if (!seconds) return undefined;
    const timer = window.setInterval(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);
  return { seconds, sent, resend };
};
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
