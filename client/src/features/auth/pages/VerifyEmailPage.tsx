import { useCallback, useState } from 'react';

import { AuthCard, AuthGate, AuthLayout, FormError, SubmitButton, TextField } from '../components';
import { AUTH_COPY, AUTH_ROUTES, INVITE_FIELD_ID, VERIFY_COPY } from '../constants';
import { useAuthConfig } from '../hooks/useAuthConfig';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useVerifyEmail } from '../hooks/useVerifyEmail';

interface VerifyEmailPageProps {
  children?: never;
}

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = () => {
  useDocumentTitle('Verify email — TermHive');
  const queryEmail = new URLSearchParams(window.location.search).get('email');
  const [inviteCode, setInviteCode] = useState('');
  const { status, auth } = useAuthConfig();
  const verify = useVerifyEmail(auth);
  const { resend, confirm } = verify;
  const email = verify.email ?? queryEmail ?? VERIFY_COPY.fallbackEmail;

  const onResend = useCallback(() => {
    void resend();
  }, [resend]);
  const onConfirm = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void confirm(inviteCode);
    },
    [confirm, inviteCode],
  );

  return (
    <AuthLayout>
      <AuthCard
        body={
          <>
            {AUTH_COPY.verify.body} <strong>{email}</strong>
          </>
        }
        title={AUTH_COPY.verify.title}
      >
        <div aria-hidden="true" className="auth-envelope">
          ✉
        </div>
        <AuthGate status={status}>
          {verify.session === 'signed-out' ? (
            <p className="auth-success">{VERIFY_COPY.signedOut}</p>
          ) : (
            <form className="auth-verify" noValidate onSubmit={onConfirm}>
              {verify.inviteError ? (
                <TextField
                  autoComplete="off"
                  className="auth-invite-code"
                  error={verify.inviteError}
                  id={INVITE_FIELD_ID}
                  label="Invite code"
                  onChange={(event) => setInviteCode(event.target.value)}
                  value={inviteCode}
                />
              ) : null}
              {verify.error ? <FormError>{verify.error}</FormError> : null}
              <SubmitButton pending={verify.pending}>{VERIFY_COPY.confirm}</SubmitButton>
              <button
                className="auth-secondary"
                disabled={Boolean(verify.cooldownSeconds) || verify.session !== 'signed-in'}
                onClick={onResend}
                type="button"
              >
                {verify.cooldownSeconds
                  ? VERIFY_COPY.resendIn(verify.cooldownSeconds)
                  : VERIFY_COPY.resend}
              </button>
              {verify.sent ? (
                <p className="auth-success" role="status">
                  {VERIFY_COPY.sent}
                </p>
              ) : null}
            </form>
          )}
        </AuthGate>
        <p className="auth-footer">
          <a href={AUTH_ROUTES.LOGIN}>{VERIFY_COPY.backToSignIn}</a>
        </p>
      </AuthCard>
    </AuthLayout>
  );
};
