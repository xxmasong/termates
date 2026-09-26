import { useCallback, useState } from 'react';

import {
  AuthCard,
  AuthGate,
  AuthLayout,
  FormError,
  ResetPasswordForm,
  SubmitButton,
  TextField,
} from '../components';
import { ACTION_COPY, ACTION_MODES, AUTH_COPY, AUTH_ROUTES, INVITE_FIELD_ID } from '../constants';
import { useAccountAction } from '../hooks/useAccountAction';
import { useAuthConfig } from '../hooks/useAuthConfig';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

interface AccountActionPageProps {
  children?: never;
}

export const AccountActionPage: React.FC<AccountActionPageProps> = () => {
  const { status, auth } = useAuthConfig();
  const action = useAccountAction(auth);
  const { state, continueToApp, resetPassword } = action;
  const [inviteCode, setInviteCode] = useState('');

  const title =
    state.kind === 'verified'
      ? ACTION_COPY.verifiedTitle
      : state.kind === 'invalid'
        ? ACTION_COPY.invalidTitle
        : AUTH_COPY.reset.title;
  useDocumentTitle(`${title} — TermHive`);

  const onContinue = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void continueToApp(inviteCode);
    },
    [continueToApp, inviteCode],
  );
  const email = state.kind === 'reset' ? state.email : '';
  const onReset = useCallback(
    (password: string, confirmation: string) => {
      void resetPassword(email, password, confirmation);
    },
    [email, resetPassword],
  );

  return (
    <AuthLayout>
      <AuthCard
        body={state.kind === 'verified' ? ACTION_COPY.verifiedBody : undefined}
        title={title}
      >
        <AuthGate status={status === 'ready' && state.kind === 'loading' ? 'loading' : status}>
          {state.kind === 'invalid' ? (
            <>
              <FormError>
                {state.mode === ACTION_MODES.VERIFY_EMAIL
                  ? ACTION_COPY.invalidVerify
                  : ACTION_COPY.invalidReset}
              </FormError>
              <p className="auth-footer">
                {state.mode === ACTION_MODES.VERIFY_EMAIL ? (
                  <a href={AUTH_ROUTES.LOGIN}>{ACTION_COPY.backToSignIn}</a>
                ) : (
                  <a href={AUTH_ROUTES.FORGOT}>{ACTION_COPY.requestNew}</a>
                )}
              </p>
            </>
          ) : null}
          {state.kind === 'verified' ? (
            <form noValidate onSubmit={onContinue}>
              {action.inviteError ? (
                <TextField
                  autoComplete="off"
                  className="auth-invite-code"
                  error={action.inviteError}
                  id={INVITE_FIELD_ID}
                  label="Invite code"
                  onChange={(event) => setInviteCode(event.target.value)}
                  value={inviteCode}
                />
              ) : null}
              {action.error ? <FormError>{action.error}</FormError> : null}
              <SubmitButton pending={action.pending}>{ACTION_COPY.continue}</SubmitButton>
            </form>
          ) : null}
          {state.kind === 'reset' ? (
            <ResetPasswordForm
              confirmError={action.confirmError}
              email={state.email}
              error={action.error}
              onSubmit={onReset}
              passwordError={action.passwordError}
              pending={action.pending}
            />
          ) : null}
          {state.kind === 'reset-done' ? (
            <>
              <p className="auth-success">{ACTION_COPY.passwordUpdated}</p>
              <a className="auth-submit" href={AUTH_ROUTES.LOGIN}>
                {ACTION_COPY.signIn}
              </a>
            </>
          ) : null}
        </AuthGate>
      </AuthCard>
    </AuthLayout>
  );
};
