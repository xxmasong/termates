import { Badge, Button } from '@/components';

import { ACCOUNT_COPY } from '../constants';
import type { Me } from '../types';
import { displayName, initials, planName } from '../utils';

interface AccountDetailsTabProps {
  me: Me;
  signingOut: boolean;
  onSignOutEverywhere: () => void;
}

export const AccountDetailsTab: React.FC<AccountDetailsTabProps> = ({
  me,
  signingOut,
  onSignOutEverywhere,
}) => (
  <div className="account-tab">
    <section className="account-section">
      <h3>{ACCOUNT_COPY.accountTitle}</h3>
      <div className="account-profile">
        {me.user.avatarUrl ? (
          <img
            alt=""
            className="account-profile__avatar"
            referrerPolicy="no-referrer"
            src={me.user.avatarUrl}
          />
        ) : (
          <span
            aria-hidden="true"
            className="account-profile__avatar account-profile__avatar--initials"
          >
            {initials(me.user)}
          </span>
        )}
        <div className="account-profile__text">
          <strong>{displayName(me.user)}</strong>
          <span>{me.user.email}</span>
        </div>
        <div className="account-profile__badges">
          <Badge tone="attention">{planName(me.plan.id)}</Badge>
          {me.user.role === 'admin' ? <Badge>{ACCOUNT_COPY.admin}</Badge> : null}
        </div>
      </div>
    </section>
    <section className="account-section">
      <h3>{ACCOUNT_COPY.workspaceTitle}</h3>
      <p className="account-muted">
        {ACCOUNT_COPY.workspaceState}:{' '}
        <Badge tone={me.workspace.state === 'running' ? 'success' : 'neutral'}>
          {me.workspace.state}
        </Badge>
      </p>
    </section>
    <section className="account-section">
      <h3>{ACCOUNT_COPY.sessionsTitle}</h3>
      <p className="account-muted">{ACCOUNT_COPY.signOutEverywhereBody}</p>
      <div>
        <Button icon="logOut" loading={signingOut} onClick={onSignOutEverywhere} variant="danger">
          {ACCOUNT_COPY.signOutEverywhere}
        </Button>
      </div>
    </section>
  </div>
);
