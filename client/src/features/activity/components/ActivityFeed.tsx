import { useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import type { ActivityEvent } from '@/types';

import { Badge, EmptyState, Icon } from '@/components';

import { useActivityFeed } from '../hooks';

const toneForEvent = (event: ActivityEvent['event']) => {
  if (event === 'agent:message') {
    return 'attention';
  }
  if (event === 'agent:started' || event === 'content:created' || event === 'content:modified') {
    return 'success';
  }
  if (event === 'agent:stopped' || event === 'content:deleted') {
    return 'danger';
  }
  return 'neutral';
};

export interface ActivityFeedProps {
  projectId?: string | null;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ projectId }) => {
  const { events, isLoading } = useActivityFeed();
  const parentRef = useRef<HTMLDivElement | null>(null);
  const scopedEvents = projectId ? events.filter((event) => event.projectId === projectId) : events;
  const virtualizer = useVirtualizer({
    count: scopedEvents.length,
    estimateSize: useCallback(() => 72, []),
    getScrollElement: () => parentRef.current,
    overscan: 8,
  });

  return (
    <section className="feature-panel activity-panel">
      <header className="feature-panel__header">
        <div>
          <h2>Activity</h2>
          <p>Bounded live history</p>
        </div>
        <Badge tone="idle" withDot>
          {scopedEvents.length}
        </Badge>
      </header>
      <div className="activity-panel__viewport" ref={parentRef}>
        {scopedEvents.length === 0 ? (
          <EmptyState icon={<Icon name="activity" size={20} />} title={isLoading ? 'Loading activity' : 'No activity yet'} />
        ) : (
          <div
            className="activity-panel__spacer"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((row) => {
              const event = scopedEvents[row.index];
              return (
                <article
                  className="activity-event"
                  key={event.id}
                  style={{ transform: `translateY(${row.start}px)` }}
                >
                  <Badge tone={toneForEvent(event.event)}>{event.event}</Badge>
                  <div>
                    <div className="activity-event__title">
                      {event.event === 'agent:message'
                        ? `${event.fromAgent ?? event.agentName ?? 'Agent'} -> ${event.toAgent ?? 'Broadcast'}`
                        : event.agentName ?? event.detail}
                    </div>
                    <p>{event.event === 'agent:message' ? event.message ?? event.detail : event.detail}</p>
                  </div>
                  <time>{new Date(event.timestamp).toLocaleTimeString()}</time>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

