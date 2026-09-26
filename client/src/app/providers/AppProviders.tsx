import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { RecoilRoot } from 'recoil';

const queryClient = new QueryClient();

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => (
  <RecoilRoot>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </RecoilRoot>
);
