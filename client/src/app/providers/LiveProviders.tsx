import type { ReactNode } from 'react';

import { WsProvider } from '@/lib/ws';

import { WsQueryInvalidation } from './WsQueryInvalidation';

interface LiveProvidersProps {
  children: ReactNode;
}

/** The workspace WebSocket — opened only once the user's workspace is up. */
export const LiveProviders: React.FC<LiveProvidersProps> = ({ children }) => (
  <WsProvider>
    <WsQueryInvalidation />
    {children}
  </WsProvider>
);
