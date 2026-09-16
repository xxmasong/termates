import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRecoilState } from 'recoil';

import type { ActivityEvent } from '@/types';

import { useWsSubscribe } from '@/lib/ws';

import { MESSAGE_EVENT_LIMIT } from '../constants';
import { listProjectMessageActivity, messageKeys } from '../api';
import { messageActivityState } from '../state';

const byNewest = (a: ActivityEvent, b: ActivityEvent): number =>
  new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();

export const useAgentMessages = (projectId: string | null) => {
  const key = projectId ?? 'none';
  const [events, setEvents] = useRecoilState(messageActivityState(key));
  const query = useQuery({
    enabled: Boolean(projectId),
    queryFn: () => listProjectMessageActivity(projectId as string),
    queryKey: messageKeys.project(projectId),
    select: (items) => items.filter((event) => event.event === 'agent:message'),
  });

  useWsSubscribe(
    'activity',
    (message) => {
      const event = message.event;
      if (!projectId || event.projectId !== projectId || event.event !== 'agent:message') {
        return;
      }

      setEvents((current) => {
        if (current.some((item) => item.id === event.id)) {
          return current;
        }

        return [event, ...current].slice(0, MESSAGE_EVENT_LIMIT);
      });
    },
    Boolean(projectId),
  );

  return useMemo(() => {
    const byId = new Map<string, ActivityEvent>();
    [...events, ...(query.data ?? [])].forEach((event) => byId.set(event.id, event));
    return [...byId.values()].sort(byNewest).slice(0, MESSAGE_EVENT_LIMIT);
  }, [events, query.data]);
};
