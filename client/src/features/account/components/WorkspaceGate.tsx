import { useCallback, type ReactNode } from 'react';

import { Spinner } from '@/components';

import { useSignOut } from '../hooks/useSignOut';
import { useWorkspaceGate } from '../hooks/useWorkspaceGate';
import { ProvisioningScreen } from './ProvisioningScreen';
import { WorkspaceErrorScreen } from './WorkspaceErrorScreen';

interface WorkspaceGateProps {
  children: ReactNode;
}

/** /app only renders once /auth/me says the user's workspace is up. */
export const WorkspaceGate: React.FC<WorkspaceGateProps> = ({ children }) => {
  const { status, retry } = useWorkspaceGate();
  const { signOut, pending } = useSignOut();
  const onSignOut = useCallback(() => signOut(), [signOut]);

  if (status === 'ready') return <>{children}</>;
  if (status === 'provisioning') return <ProvisioningScreen />;
  if (status === 'error') {
    return <WorkspaceErrorScreen onRetry={retry} onSignOut={onSignOut} signingOut={pending} />;
  }
  return (
    <main aria-busy="true" className="account-screen">
      <Spinner size={24} />
    </main>
  );
};
