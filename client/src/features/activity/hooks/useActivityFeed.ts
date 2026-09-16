import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRecoilState } from 'recoil';

import type { ActivityEvent } from '@/types';

import { useWsSubscribe } from '@/lib/ws';

import { getActivityHistory, activityKeys } from '../api';
import { ACTIVITY_RENDER_LIMIT, LIVE_ACTIVITY_LIMIT } from '../constants';
import { liveActivityState } from '../state';

const byNewest = (a: ActivityEvent, b: ActivityEvent): number =>
  new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();

export const useActivityFeed = () => {
  const query = useQuery({
    queryFn: getActivityHistory,
    queryKey: activityKeys.history(),
  });
  const [liveEvents, setLiveEvents] = useRecoilState(liveActivityState);

  useWsSubscribe('activity', (message) => {
    setLiveEvents((current) => {
      if (current.some((item) => item.id === message.event.id)) {
        return current;
      }

      return [message.event, ...current].slice(0, LIVE_ACTIVITY_LIMIT);
    });
  });

  const events = useMemo(() => {
    const byId = new Map<string, ActivityEvent>();
    [...liveEvents, ...(query.data ?? [])].forEach((event) => byId.set(event.id, event));
    return [...byId.values()].sort(byNewest).slice(0, ACTIVITY_RENDER_LIMIT);
  }, [liveEvents, query.data]);

  return { ...query, events };
};

