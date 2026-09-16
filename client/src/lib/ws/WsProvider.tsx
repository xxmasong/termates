import { useEffect, type ReactNode } from 'react';

import { webSocketClient } from './wsClient';

export interface WsProviderProps {
  children: ReactNode;
}

export const WsProvider: React.FC<WsProviderProps> = ({ children }) => {
  useEffect(() => {
    webSocketClient.connect();

    return () => webSocketClient.disconnect();
  }, []);

  return <>{children}</>;
};
