import { useCallback, useState } from 'react';

import { Button, Modal, Spinner } from '@/components';

import type { CliAuth } from '../types';

export interface AuthModalProps {
  cli: { key: string; label: string } | null;
  auth?: CliAuth;
  loading?: boolean;
  loggingOut?: boolean;
  error?: string | null;
  onClose: () => void;
  onLogout: (cli: string) => void;
}

const formatExpiry = (iso: string | null, expired: boolean): string => {
  if (!iso) return '—';

  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return '—';

  const stamp = when.toLocaleString();
  return expired ? `${stamp} (expired)` : stamp;
};

export const AuthModal: React.FC<AuthModalProps> = ({
  cli,
  auth,
  loading = false,
  loggingOut = false,
  error,
  onClose,
  onLogout,
}) => {
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const close = useCallback(() => {
    setConfirmingLogout(false);
    onClose();
  }, [onClose]);

  const logout = useCallback(() => {
    if (cli) {
      onLogout(cli.key);
      setConfirmingLogout(false);
    }
  }, [cli, onLogout]);

  return (
    <Modal onClose={close} open={Boolean(cli)} title={cli ? `${cli.label} account` : ''} width={520}>
      {loading || !auth ? (
        <div className="feature-loading">
          <Spinner />
        </div>
      ) : (
        <div className="auth-modal">
          <dl className="auth-modal__facts">
            <dt>Status</dt>
            <dd>
              <span
                className={`auth-modal__dot auth-modal__dot--${
                  auth.loggedIn && !auth.expired ? 'ok' : auth.loggedIn ? 'warn' : 'off'
                }`}
              />
              {auth.loggedIn ? (auth.expired ? 'Signed in, token expired' : 'Signed in') : 'Signed out'}
            </dd>

            {auth.account ? (
              <>
                <dt>Account</dt>
                <dd>{auth.account}</dd>
              </>
            ) : null}

            {auth.plan ? (
              <>
                <dt>Plan</dt>
                <dd>{auth.plan}</dd>
              </>
            ) : null}

            {auth.expiresAt ? (
              <>
                <dt>Token expires</dt>
                <dd>{formatExpiry(auth.expiresAt, auth.expired)}</dd>
              </>
            ) : null}
          </dl>

          <p className="auth-modal__note">
            Signing in runs in the CLI itself — none of these tools can be signed in from a
            browser. Run this in any agent terminal, or on the host:
          </p>
          <code className="auth-modal__command">{auth.loginCommand}</code>

          {error ? <div className="feature-error">{error}</div> : null}

          {auth.loggedIn ? (
            auth.canLogout ? (
              confirmingLogout ? (
                <div className="auth-modal__confirm">
                  <span>Sign out of {cli?.label}? Running agents will fail until you sign in again.</span>
                  <div className="auth-modal__confirm-actions">
                    <Button onClick={() => setConfirmingLogout(false)} size="sm" variant="ghost">
                      Cancel
                    </Button>
                    <Button loading={loggingOut} onClick={logout} size="sm" variant="danger">
                      Sign out
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setConfirmingLogout(true)} size="sm" variant="danger">
                  Sign out
                </Button>
              )
            ) : (
              <p className="auth-modal__note">
                {cli?.label} signs out from inside its own session — start it and run{' '}
                <code>/auth</code>.
              </p>
            )
          ) : null}
        </div>
      )}
    </Modal>
  );
};
