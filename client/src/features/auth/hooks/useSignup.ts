import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  type Auth,
} from 'firebase/auth';
import { useCallback, useState } from 'react';

import type { PlanId } from '@/constants';

import { AUTH_COPY, AUTH_ROUTES, FIELD_REQUIRED, WEAK_PASSWORD_MESSAGE } from '../constants';
import type { FieldErrors, SignupMode } from '../types';
import { authErrorMessage, errorCode, savePendingSignup } from '../utils';

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  plan: PlanId;
  inviteCode: string;
}

/** Mirrors the PasswordStrength rules so the form fails before Firebase does. */
export const isValidPassword = (password: string, email: string): boolean =>
  password.length >= 10 &&
  /[a-z]/i.test(password) &&
  /\d/.test(password) &&
  !(email && password.toLowerCase().includes(email.toLowerCase()));

const FIELD_BY_FIREBASE_CODE: Readonly<Record<string, keyof FieldErrors>> = {
  'auth/email-already-in-use': 'email',
  'auth/invalid-email': 'email',
  'auth/weak-password': 'password',
};

/**
 * Create the Firebase account, name it, send the verification email and keep
 * plan + invite for the session exchange after the email is verified.
 */
export const useSignup = (
  auth: Auth | null,
  signupMode: SignupMode,
  navigate: (path: string) => void,
) => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [fields, setFields] = useState<FieldErrors>({});

  const submit = useCallback(
    async ({ name, email, password, plan, inviteCode }: SignupInput) => {
      const next: FieldErrors = {};
      if (signupMode === 'invite' && !inviteCode.trim()) next.inviteCode = AUTH_COPY.inviteRequired;
      if (!name.trim()) next.name = FIELD_REQUIRED.name;
      if (!email) next.email = FIELD_REQUIRED.email;
      if (!isValidPassword(password, email)) next.password = WEAK_PASSWORD_MESSAGE;
      setFields(next);
      if (Object.keys(next).length || !auth) return;

      setPending(true);
      setError(undefined);
      try {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        savePendingSignup({
          plan,
          ...(inviteCode.trim() ? { inviteCode: inviteCode.trim() } : {}),
        });
        await updateProfile(user, { displayName: name.trim() });
        await sendEmailVerification(user);
        navigate(`${AUTH_ROUTES.VERIFY}?email=${encodeURIComponent(email)}`);
      } catch (reason) {
        const field = FIELD_BY_FIREBASE_CODE[errorCode(reason) ?? ''];
        const message = authErrorMessage(reason) ?? undefined;
        if (field) setFields({ [field]: message });
        else setError(message);
      } finally {
        setPending(false);
      }
    },
    [auth, navigate, signupMode],
  );

  return { pending, error, fields, submit };
};
