import { useCallback, useEffect, useState } from 'react';

import {
  AuthCard,
  AuthGate,
  AuthLayout,
  FormError,
  OAuthButtons,
  OrDivider,
  PasswordField,
  SubmitButton,
  TextField,
} from '../components';
import { AUTH_COPY, AUTH_ROUTES, INVITE_FIELD_ID } from '../constants';
import { useAuthConfig } from '../hooks/useAuthConfig';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useLogin } from '../hooks/useLogin';

interface LoginPageProps {
  navigate: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ navigate }) => {
  useDocumentTitle('Sign in — TermHive');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const { status, auth } = useAuthConfig();
  const { pending, error, fields, inviteRequired, submit } = useLogin(auth, navigate);

  useEffect(() => {
    if (inviteRequired) document.getElementById(INVITE_FIELD_ID)?.focus();
  }, [inviteRequired]);

  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void submit(email, password, inviteCode);
    },
    [email, inviteCode, password, submit],
  );

  return (
    <AuthLayout>
      <AuthCard body={AUTH_COPY.login.body} title={AUTH_COPY.login.title}>
        <AuthGate status={status}>
          <OAuthButtons mode="login" />
          <OrDivider />
          <form noValidate onSubmit={onSubmit}>
            {inviteRequired ? (
              <TextField
                autoComplete="off"
                className="auth-invite-code"
                error={fields.inviteCode}
                id={INVITE_FIELD_ID}
                label="Invite code"
                onChange={(event) => setInviteCode(event.target.value)}
                value={inviteCode}
              />
            ) : null}
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
        </AuthGate>
        <p className="auth-footer">
          New to TermHive? <a href={AUTH_ROUTES.SIGNUP}>Create an account</a>
        </p>
      </AuthCard>
    </AuthLayout>
  );
};
