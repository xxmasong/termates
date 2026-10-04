import { TermatesShell } from '@/app/TermatesShell';
import { AppProviders } from '@/app/providers/AppProviders';
import { LiveProviders } from '@/app/providers/LiveProviders';
import { WorkspaceGate } from '@/features/account';

interface WorkspaceRouteProps {
  children?: never;
}

export const WorkspaceRoute: React.FC<WorkspaceRouteProps> = () => (
  <AppProviders>
    <WorkspaceGate>
      <LiveProviders>
        <TermatesShell />
      </LiveProviders>
    </WorkspaceGate>
  </AppProviders>
);
