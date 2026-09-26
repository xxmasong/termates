import { useEffect, useState } from 'react';
import { SESSION_ENDPOINT } from '../constants';
import type { SessionStatus } from '../types';
export const useSessionStatus = () => {
  const [status, setStatus] = useState<SessionStatus>('unknown');
  useEffect(() => {
    let active = true;
    void fetch(SESSION_ENDPOINT, { credentials: 'same-origin' })
      .then((response) => {
        if (active) setStatus(response.ok ? 'signed-in' : 'signed-out');
      })
      .catch(() => {
        if (active) setStatus('signed-out');
      });
    return () => {
      active = false;
    };
  }, []);
  return status;
};
