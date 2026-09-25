import { useCallback } from 'react';
import { AuthCard, AuthLayout } from '../components';
import { AUTH_COPY, AUTH_ROUTES } from '../constants';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useResendVerification } from '../hooks/usePasswordActions';
interface VerifyEmailPageProps {
  children?: never;
}
export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = () => {
  useDocumentTitle('Verify email — TermHive');
  const email = new URLSearchParams(window.location.search).get('email') ?? 'your email';
  const { seconds, sent, resend } = useResendVerification();
  const onResend = useCallback(() => {
    void resend(email);
  }, [email, resend]);
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
        <div className="auth-envelope">✉</div>
        <button
          className="auth-secondary"
          disabled={Boolean(seconds)}
          onClick={onResend}
          type="button"
        >
          {seconds ? `Resend in ${seconds}s` : 'Resend email'}
        </button>
        {sent ? <p className="auth-success">Sent. Check your spam folder too.</p> : null}
        <p className="auth-footer">
          <a href={AUTH_ROUTES.LOGIN}>Back to sign in</a>
        </p>
      </AuthCard>
    </AuthLayout>
  );
};
