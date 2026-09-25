import { useCallback, useState } from 'react';
import {
  AuthCard,
  AuthLayout,
  FormError,
  OAuthButtons,
  OrDivider,
  PasswordField,
  SubmitButton,
  TextField,
} from '../components';
import { AUTH_COPY, AUTH_ROUTES } from '../constants';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useLogin } from '../hooks/useLogin';
interface LoginPageProps {
  children?: never;
}
export const LoginPage: React.FC<LoginPageProps> = () => {
  useDocumentTitle('Sign in — TermHive');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { pending, error, fields, submit } = useLogin();
  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void submit(email, password);
    },
    [email, password, submit],
  );
  return (
    <AuthLayout>
      <AuthCard body={AUTH_COPY.login.body} title={AUTH_COPY.login.title}>
        <OAuthButtons mode="login" />
        <OrDivider />
        <form onSubmit={onSubmit}>
          <TextField
            autoComplete="email"
            error={fields.email}
            label="Email"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
          <PasswordField
            action={<a href={AUTH_ROUTES.FORGOT}>Forgot password?</a>}
            autoComplete="current-password"
            error={fields.password}
            onChange={(event) => setPassword(event.target.value)}
            value={password}
          />
          {error ? <FormError>{error}</FormError> : null}
          <SubmitButton pending={pending}>Sign in</SubmitButton>
        </form>
        <p className="auth-footer">
          New to TermHive? <a href={AUTH_ROUTES.SIGNUP}>Create an account</a>
        </p>
      </AuthCard>
    </AuthLayout>
  );
};
