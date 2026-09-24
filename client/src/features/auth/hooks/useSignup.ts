import { useCallback, useState } from 'react';
import type { PlanId } from '@/constants';
import { signup } from '../api/authApi';
import { AUTH_COPY } from '../constants';
import type { AuthError, FieldErrors } from '../types';

const validPassword = (password: string, email: string) => password.length >= 10 && /[a-z]/i.test(password) && /\d/.test(password) && !password.toLowerCase().includes(email.toLowerCase());

export const useSignup = () => { const [pending, setPending] = useState(false); const [error, setError] = useState<string>(); const [fields, setFields] = useState<FieldErrors>({}); const submit = useCallback(async (name: string, email: string, password: string, plan: PlanId, navigate: (path: string) => void) => { const next: FieldErrors = {}; if (!name) next.name = 'Name is required.'; if (!email) next.email = 'Email is required.'; if (!validPassword(password, email)) next.password = 'Choose a stronger password.'; setFields(next); if (Object.keys(next).length) return; setPending(true); setError(undefined); try { await signup(name, email, password, plan); navigate(`/verify-email?email=${encodeURIComponent(email)}`); } catch (reason) { const authError = reason as AuthError; if (authError.code === 'EMAIL_TAKEN') setFields({ email: 'An account with this email already exists.' }); else if (authError.code === 'WEAK_PASSWORD') setFields({ password: 'Choose a stronger password.' }); else setError(authError.code === 'SIGNUPS_CLOSED' ? 'Sign-ups are invite-only right now.' : authError.code === 'RATE_LIMITED' ? 'Too many attempts. Try again in a few minutes.' : AUTH_COPY.genericError); } finally { setPending(false); } }, []); return { pending, error, fields, submit }; };
