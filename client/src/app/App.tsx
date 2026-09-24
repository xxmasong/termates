import { ThemeBootstrap } from '@/app/providers/ThemeBootstrap';
import { AppRouter } from '@/app/routes/AppRouter';

interface AppProps {
  children?: never;
}

export const App: React.FC<AppProps> = () => (
  <>
    <ThemeBootstrap />
    <AppRouter />
  </>
);
