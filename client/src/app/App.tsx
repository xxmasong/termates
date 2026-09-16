import { AppProviders } from '@/app/providers/AppProviders';
import { ThemeBootstrap } from '@/app/providers/ThemeBootstrap';
import { PlaceholderShell } from '@/components/templates/PlaceholderShell';

interface AppProps {
  children?: never;
}

export const App: React.FC<AppProps> = () => (
  <AppProviders>
    <ThemeBootstrap />
    <PlaceholderShell />
  </AppProviders>
);
