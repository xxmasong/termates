import type { ReactNode } from 'react';

import { Spinner } from '@/components';

import type { AuthConfigStatus } from '../types';
import { NotConfiguredNotice } from './NotConfiguredNotice';

interface AuthGateProps {
  status: AuthConfigStatus;
  children: ReactNode;
}

/** Renders the form only once Firebase is configured; otherwise a notice. */
export const AuthGate: React.FC<AuthGateProps> = ({ status, children }) => {
  if (status === 'loading') {
    return (
      <div aria-busy="true" className="auth-gate-loading">
        <Spinner size={20} />
      </div>
    );
  }
  if (status === 'unconfigured') return <NotConfiguredNotice />;
  return <>{children}</>;
};
