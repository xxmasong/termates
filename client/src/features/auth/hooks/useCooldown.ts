import { useCallback, useEffect, useState } from 'react';

const TICK_MS = 1000;

/** A seconds countdown; `start()` restarts it. */
export const useCooldown = (seconds: number) => {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!remaining) return undefined;
    const timer = window.setInterval(
      () => setRemaining((value) => Math.max(0, value - 1)),
      TICK_MS,
    );
    return () => window.clearInterval(timer);
  }, [remaining]);

  const start = useCallback(() => setRemaining(seconds), [seconds]);
  return { remaining, start };
};
