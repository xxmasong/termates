import { Button, Icon } from '@/components';

import { ACCOUNT_COPY } from '../constants';

interface WorkspaceErrorScreenProps {
  onRetry: () => void;
  onSignOut: () => void;
  signingOut: boolean;
}

export const WorkspaceErrorScreen: React.FC<WorkspaceErrorScreenProps> = ({
  onRetry,
  onSignOut,
  signingOut,
}) => (
  <main className="account-screen" role="alert">
    <div className="account-screen__mark account-screen__mark--error">
      <Icon name="logo" size={28} />
    </div>
    <h1>{ACCOUNT_COPY.errorTitle}</h1>
    <p>{ACCOUNT_COPY.errorBody}</p>
    <div className="account-screen__actions">
      <Button onClick={onRetry} variant="primary">
        {ACCOUNT_COPY.retry}
      </Button>
      <Button loading={signingOut} onClick={onSignOut} variant="ghost">
        {ACCOUNT_COPY.signOut}
      </Button>
    </div>
  </main>
);
