import { useCallback, useState } from 'react';
import { AuthCard, AuthGate, AuthLayout, SubmitButton, TextField } from '../components';
import { AUTH_COPY, AUTH_ROUTES } from '../constants';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAuthConfig } from '../hooks/useAuthConfig';
import { useForgotPassword } from '../hooks/useForgotPassword';
interface ForgotPasswordPageProps {
  children?: never;
}
export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = () => {
  useDocumentTitle('Reset password — TermHive');
  const [email, setEmail] = useState('');
  const { status, auth } = useAuthConfig();
  const { pending, sent, error, submit } = useForgotPassword(auth);
  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void submit(email);
    },
    [email, submit],
  );
  return (
    <AuthLayout>
      <AuthCard body={AUTH_COPY.forgot.body} title={AUTH_COPY.forgot.title}>
        <AuthGate status={status}>
          {sent ? (
            <>
              <p className="auth-success">
                If an account exists for <strong>{email}</strong>, a reset link is on its way.
              </p>
              <p className="auth-footer">
                <a href={AUTH_ROUTES.LOGIN}>Back to sign in</a>
              </p>
            </>
          ) : (
            <form noValidate onSubmit={onSubmit}>
              <TextField
                autoComplete="email"
                error={error}
                label="Email"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
              <SubmitButton pending={pending}>Send reset link</SubmitButton>
            </form>
          )}
        </AuthGate>
      </AuthCard>
    </AuthLayout>
  );
};
