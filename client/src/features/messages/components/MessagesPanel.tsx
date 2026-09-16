import { useCallback, useMemo, useState } from 'react';

import type { Agent } from '@/types';

import { Badge, Button, EmptyState, FormField, Icon, Textarea } from '@/components';

import { MESSAGE_TARGET_AUTO, MESSAGE_TARGET_BROADCAST } from '../constants';
import { useAgentMessages, useBroadcastMessage, useSendAgentMessage, useTeammates } from '../hooks';

export interface MessagesPanelProps {
  projectId: string;
  agents: Agent[];
  selectedAgentId: string | null;
}

export const MessagesPanel: React.FC<MessagesPanelProps> = ({ projectId, agents, selectedAgentId }) => {
  const [fromAgentOverrideId, setFromAgentOverrideId] = useState<string | null>(null);
  const [targetSelection, setTargetSelection] = useState(MESSAGE_TARGET_AUTO);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const events = useAgentMessages(projectId);
  const fromAgentId = fromAgentOverrideId ?? selectedAgentId ?? agents[0]?.id ?? '';
  const teammatesQuery = useTeammates(projectId, fromAgentId || null);
  const sendMutation = useSendAgentMessage();
  const broadcastMutation = useBroadcastMessage();

  const fromAgent = useMemo(
    () => agents.find((agent) => agent.id === fromAgentId) ?? null,
    [agents, fromAgentId],
  );
  const teammates = useMemo(() => teammatesQuery.data ?? [], [teammatesQuery.data]);
  const target = useMemo(() => {
    if (targetSelection === MESSAGE_TARGET_BROADCAST) {
      return MESSAGE_TARGET_BROADCAST;
    }

    if (teammates.some((agent) => agent.id === targetSelection)) {
      return targetSelection;
    }

    return teammates[0]?.id ?? MESSAGE_TARGET_BROADCAST;
  }, [targetSelection, teammates]);
  const targetAgent = useMemo(
    () => teammates.find((agent) => agent.id === target) ?? null,
    [target, teammates],
  );

  const onFromChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setFromAgentOverrideId(event.target.value || null);
    setTargetSelection(MESSAGE_TARGET_AUTO);
    setError(null);
  }, []);
  const onTargetChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setTargetSelection(event.target.value);
    setError(null);
  }, []);
  const onMessageChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
    setError(null);
  }, []);
  const onSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const trimmed = message.trim();
      if (!fromAgentId || !trimmed) {
        return;
      }

      if (target === MESSAGE_TARGET_BROADCAST) {
        broadcastMutation.mutate(
          { input: { text: trimmed }, projectId },
          {
            onError: (mutationError) => {
              setError(mutationError instanceof Error ? mutationError.message : 'Broadcast failed.');
            },
            onSuccess: () => {
              setError(null);
              setMessage('');
            },
          },
        );
        return;
      }

      if (!fromAgent || !targetAgent) {
        setError('Choose a teammate before sending.');
        return;
      }

      sendMutation.mutate(
        {
          input: {
            fromAgentId,
            fromAgentName: fromAgent.name,
            message: trimmed,
            target: targetAgent.name,
          },
          projectId,
        },
        {
          onError: (mutationError) => {
            setError(mutationError instanceof Error ? mutationError.message : 'Message failed.');
          },
          onSuccess: () => {
            setError(null);
            setMessage('');
          },
        },
      );
    },
    [broadcastMutation, fromAgent, fromAgentId, message, projectId, sendMutation, target, targetAgent],
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
              <option value={MESSAGE_TARGET_BROADCAST}>Broadcast</option>
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
        {error ? <p className="messages-panel__error">{error}</p> : null}
        <div className="feature-panel__actions">
          <Button disabled={!fromAgentId || !message.trim()} icon="send" loading={sending} type="submit" variant="primary">
            Send
          </Button>
        </div>
      </form>
    </section>
  );
};
