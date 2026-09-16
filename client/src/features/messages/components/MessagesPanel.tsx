import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Agent } from '@/types';

import { Badge, Button, EmptyState, FormField, Icon, Textarea } from '@/components';

import { useAgentMessages, useBroadcastMessage, useSendAgentMessage, useTeammates } from '../hooks';

export interface MessagesPanelProps {
  projectId: string;
  agents: Agent[];
  selectedAgentId: string | null;
}

export const MessagesPanel: React.FC<MessagesPanelProps> = ({ projectId, agents, selectedAgentId }) => {
  const [fromAgentId, setFromAgentId] = useState(selectedAgentId ?? agents[0]?.id ?? '');
  const [target, setTarget] = useState('broadcast');
  const [message, setMessage] = useState('');
  const events = useAgentMessages(projectId);
  const teammatesQuery = useTeammates(projectId, fromAgentId || null);
  const sendMutation = useSendAgentMessage();
  const broadcastMutation = useBroadcastMessage();

  const fromAgent = useMemo(
    () => agents.find((agent) => agent.id === fromAgentId) ?? null,
    [agents, fromAgentId],
  );
  const teammates = useMemo(() => teammatesQuery.data ?? [], [teammatesQuery.data]);

  useEffect(() => {
    if (selectedAgentId && selectedAgentId !== fromAgentId) {
      setFromAgentId(selectedAgentId);
      setTarget('broadcast');
      return;
    }

    if (!fromAgentId && agents[0]) {
      setFromAgentId(agents[0].id);
    }
  }, [agents, fromAgentId, selectedAgentId]);

  useEffect(() => {
    if (target !== 'broadcast' && !teammates.some((agent) => agent.id === target)) {
      setTarget('broadcast');
    }
  }, [target, teammates]);

  const onFromChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setFromAgentId(event.target.value);
    setTarget('broadcast');
  }, []);
  const onTargetChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setTarget(event.target.value);
  }, []);
  const onMessageChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
  }, []);
  const onSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const trimmed = message.trim();
      if (!fromAgentId || !trimmed) {
        return;
      }

      if (target === 'broadcast') {
        broadcastMutation.mutate(
          { input: { fromAgentId, message: trimmed }, projectId },
          { onSuccess: () => setMessage('') },
        );
        return;
      }

      sendMutation.mutate(
        { input: { fromAgentId, message: trimmed, toAgentId: target }, projectId },
        { onSuccess: () => setMessage('') },
      );
    },
    [broadcastMutation, fromAgentId, message, projectId, sendMutation, target],
  );

  const sending = sendMutation.isPending || broadcastMutation.isPending;

  return (
    <section className="feature-panel messages-panel">
      <header className="feature-panel__header">
        <div>
          <h2>Messages</h2>
          <p>Agent-to-agent coordination</p>
        </div>
        <Badge tone="idle" withDot>
          Live
        </Badge>
      </header>

      <div className="messages-panel__conversation">
        {events.length === 0 ? (
          <EmptyState icon={<Icon name="message" size={20} />} title="No messages yet" />
        ) : (
          events.map((event) => (
            <article className="message-event" key={event.id}>
              <header className="message-event__meta">
                <span>{event.fromAgent ?? event.agentName ?? 'Agent'}</span>
                <Icon name="arrowR" size={13} />
                <span>{event.toAgent ?? 'Broadcast'}</span>
                <time>{new Date(event.timestamp).toLocaleTimeString()}</time>
              </header>
              <p>{event.message ?? event.detail}</p>
            </article>
          ))
        )}
      </div>

      <form className="messages-panel__composer" onSubmit={onSubmit}>
        <div className="messages-panel__row">
          <FormField label="From">
            <select className="input" onChange={onFromChange} value={fromAgentId}>
              <option value="">Choose agent</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="To">
            <select className="input" disabled={!fromAgent} onChange={onTargetChange} value={target}>
              <option value="broadcast">Broadcast</option>
              {teammates.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <FormField label="Message">
          <Textarea onChange={onMessageChange} rows={4} value={message} />
        </FormField>
        <div className="feature-panel__actions">
          <Button disabled={!fromAgentId || !message.trim()} icon="send" loading={sending} type="submit" variant="primary">
            Send
          </Button>
        </div>
      </form>
    </section>
  );
};
