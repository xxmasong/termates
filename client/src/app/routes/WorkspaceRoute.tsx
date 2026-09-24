import { TermHiveShell } from '@/app/TermHiveShell';
import { AppProviders } from '@/app/providers/AppProviders';

interface WorkspaceRouteProps {
  children?: never;
}

export const WorkspaceRoute: React.FC<WorkspaceRouteProps> = () => (
  <AppProviders>
    <TermHiveShell />
  </AppProviders>
);
