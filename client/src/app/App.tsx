import { AppProviders } from '@/app/providers/AppProviders';
import { ThemeBootstrap } from '@/app/providers/ThemeBootstrap';
import { TermHiveShell } from '@/app/TermHiveShell';

interface AppProps {
  children?: never;
}

export const App: React.FC<AppProps> = () => (
    <AppProviders>
      <ThemeBootstrap />
      <TermHiveShell />
    </AppProviders>
  );
