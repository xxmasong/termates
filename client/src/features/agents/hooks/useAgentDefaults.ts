import { useCallback, useMemo } from 'react';

import { STORAGE_KEYS } from '@/constants';
import { useLocalStorage } from '@/lib/hooks';

import { DEFAULT_AGENT_DEFAULTS } from '../constants';
import type { AgentDefaults } from '../types';

/** Per-browser defaults for new agents; partial updates merge into the stored value. */
export const useAgentDefaults = () => {
  const [stored, setStored] = useLocalStorage<AgentDefaults>(
    STORAGE_KEYS.AGENT_DEFAULTS,
    DEFAULT_AGENT_DEFAULTS,
  );
  const defaults = useMemo<AgentDefaults>(
    () => ({ ...DEFAULT_AGENT_DEFAULTS, ...stored }),
    [stored],
  );

  const update = useCallback(
    (patch: Partial<AgentDefaults>) =>
      setStored((current) => ({ ...DEFAULT_AGENT_DEFAULTS, ...current, ...patch })),
    [setStored],
  );

  return { defaults, update };
};
