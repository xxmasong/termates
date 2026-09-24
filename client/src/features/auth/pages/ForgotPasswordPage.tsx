import { useCallback, useState } from 'react';
import { AuthCard, AuthLayout, SubmitButton, TextField } from '../components';
import { AUTH_COPY, AUTH_ROUTES } from '../constants';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useForgotPassword } from '../hooks/usePasswordActions';
interface ForgotPasswordPageProps { children?: never; }
export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = () => { useDocumentTitle('Reset password — TermHive'); const [email, setEmail] = useState(''); const { pending, sent, submit } = useForgotPassword(); const onSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); void submit(email); }, [email, submit]); return <AuthLayout><AuthCard body={AUTH_COPY.forgot.body} title={AUTH_COPY.forgot.title}>{sent ? <><p className="auth-success">If an account exists for <strong>{email}</strong>, a reset link is on its way.</p><p className="auth-footer"><a href={AUTH_ROUTES.LOGIN}>Back to sign in</a></p></> : <form onSubmit={onSubmit}><TextField autoComplete="email" label="Email" onChange={(event) => setEmail(event.target.value)} type="email" value={email} /><SubmitButton pending={pending}>Send reset link</SubmitButton></form>}</AuthCard></AuthLayout>; };
