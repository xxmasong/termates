import { useCallback, useEffect, useState } from 'react';

import type { PlanId } from '@/constants';

import {
  AuthCard,
  AuthGate,
  AuthLayout,
  FormError,
  OAuthButtons,
  OrDivider,
  PasswordField,
  PasswordStrength,
  PlanPicker,
  SubmitButton,
  TextField,
} from '../components';
import { AUTH_COPY, AUTH_ROUTES, INVITE_FIELD_ID } from '../constants';
import { useAuthConfig } from '../hooks/useAuthConfig';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useSignup } from '../hooks/useSignup';

interface SignupPageProps {
  navigate: (path: string) => void;
}

const initialPlan = (): PlanId => {
  const plan = new URLSearchParams(window.location.search).get('plan');
  return plan === 'pro' || plan === 'pro-plus' ? plan : 'free';
};

export const SignupPage: React.FC<SignupPageProps> = ({ navigate }) => {
  const parameters = new URLSearchParams(window.location.search);
  const inviteParameter = parameters.get('invite') ?? '';
  const hasInviteParameter = parameters.has('invite');
  useDocumentTitle('Create account — TermHive');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(inviteParameter);
  const [plan, setPlan] = useState<PlanId>(initialPlan);
  const { status, auth, signupMode } = useAuthConfig();
  const { pending, error, fields, submit } = useSignup(auth, signupMode, navigate);
  const showInvite = hasInviteParameter || signupMode === 'invite' || Boolean(fields.inviteCode);

  useEffect(() => {
    if (fields.inviteCode) document.getElementById(INVITE_FIELD_ID)?.focus();
  }, [fields.inviteCode]);

  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void submit({ name, email, password, plan, inviteCode });
    },
    [email, inviteCode, name, password, plan, submit],
  );

  return (
    <AuthLayout>
      <AuthCard body={AUTH_COPY.signup.body} title={AUTH_COPY.signup.title}>
        <AuthGate status={status}>
          <PlanPicker onChange={setPlan} plan={plan} />
          <OAuthButtons invite={showInvite ? inviteCode : undefined} mode="signup" plan={plan} />
          <OrDivider />
          <form noValidate onSubmit={onSubmit}>
            {showInvite ? (
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
              autoComplete="name"
              error={fields.name}
              label="Name"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
            <TextField
              autoComplete="email"
              error={fields.email}
              label="Email"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
            <PasswordField
              autoComplete="new-password"
              error={fields.password}
              onChange={(event) => setPassword(event.target.value)}
              value={password}
            />
            <PasswordStrength email={email} password={password} />
            {error ? <FormError>{error}</FormError> : null}
            <SubmitButton pending={pending}>Create account</SubmitButton>
          </form>
          <p className="auth-legal">{AUTH_COPY.legal}</p>
        </AuthGate>
        <p className="auth-footer">
          Already have an account? <a href={AUTH_ROUTES.LOGIN}>Sign in</a>
        </p>
      </AuthCard>
    </AuthLayout>
  );
};
