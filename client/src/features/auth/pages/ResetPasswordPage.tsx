import { useCallback, useState } from 'react';
import {
  AuthCard,
  AuthLayout,
  FormError,
  PasswordField,
  PasswordStrength,
  SubmitButton,
} from '../components';
import { AUTH_COPY, AUTH_ROUTES } from '../constants';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useResetPassword } from '../hooks/usePasswordActions';
interface ResetPasswordPageProps {
  children?: never;
}
export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = () => {
  useDocumentTitle('Choose a new password — TermHive');
  const token = new URLSearchParams(window.location.search).get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [matchError, setMatchError] = useState<string>();
  const { pending, success, error, submit } = useResetPassword();
  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (password !== confirm) {
        setMatchError("Passwords don't match.");
        return;
      }
      if (token) void submit(token, password);
    },
    [confirm, password, submit, token],
  );
  if (!token)
    return (
      <AuthLayout>
        <AuthCard title={AUTH_COPY.reset.title}>
          <FormError>This reset link is invalid or has expired.</FormError>
          <p className="auth-footer">
            <a href={AUTH_ROUTES.FORGOT}>Request a new one</a>
          </p>
        </AuthCard>
      </AuthLayout>
    );
  return (
    <AuthLayout>
      <AuthCard title={AUTH_COPY.reset.title}>
        {success ? (
          <>
            <p className="auth-success">Password updated.</p>
            <a className="auth-submit" href={AUTH_ROUTES.LOGIN}>
              Sign in
            </a>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <PasswordField
              autoComplete="new-password"
              onChange={(event) => setPassword(event.target.value)}
              value={password}
            />
            <PasswordStrength email="" password={password} />
            <PasswordField
              autoComplete="new-password"
              error={matchError}
              label="Confirm password"
              onChange={(event) => setConfirm(event.target.value)}
              value={confirm}
            />
            {error ? <FormError>{error}</FormError> : null}
            <SubmitButton pending={pending}>Update password</SubmitButton>
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  );
};
