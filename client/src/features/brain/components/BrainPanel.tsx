import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button, EmptyState, Icon, Textarea } from '@/components';

import { useBrainActions, useBrainState } from '../hooks';
import { BrainConversationSwitcher } from './BrainConversationSwitcher';
import { BrainMessageRow } from './BrainMessageRow';

export interface BrainPanelProps {
  children?: never;
}

export const BrainPanel: React.FC<BrainPanelProps> = () => {
  const [input, setInput] = useState('');
  const [showConversations, setShowConversations] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const { brainState, loading } = useBrainState();
  const { abort, deleteConversation, sendMessage, startNew, switchConversation } = useBrainActions();
  const currentTitle = useMemo(
    () =>
      brainState.conversations.find((conversation) => conversation.id === brainState.currentId)?.title ??
      'New conversation',
    [brainState.conversations, brainState.currentId],
  );

  useEffect(() => {
    if (stickToBottomRef.current && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [brainState.messages.length, brainState.status]);

  const onScroll = useCallback(() => {
    const body = bodyRef.current;

    if (!body) {
      return;
    }

    stickToBottomRef.current = body.scrollHeight - body.scrollTop - body.clientHeight < 30;
  }, []);

  const submit = useCallback(() => {
    const message = input.trim();

    if (!message || brainState.status === 'thinking') {
      return;
    }

    sendMessage(message);
    setInput('');
    setShowConversations(false);
    stickToBottomRef.current = true;
  }, [brainState.status, input, sendMessage]);

  const startConversation = useCallback(() => {
    startNew();
    setShowConversations(false);
    setInput('');
  }, [startNew]);

  const switchToConversation = useCallback(
    (conversationId: string) => {
      switchConversation(conversationId);
      setShowConversations(false);
      stickToBottomRef.current = true;
    },
    [switchConversation],
  );

  return (
    <section className="brain-panel">
      <header className="brain-panel__header">
        <div className="brain-panel__brand">
          <Icon name="logo" size={15} />
          <span>
            <strong>The Keeper</strong>
            <small>{currentTitle}</small>
          </span>
        </div>
        <div className="brain-panel__actions">
          <Button
            aria-pressed={showConversations}
            icon="book"
            iconOnly
            onClick={() => setShowConversations((current) => !current)}
            size="sm"
            title="Conversations"
            variant="ghost"
          />
          <Button icon="plus" iconOnly onClick={startConversation} size="sm" title="New" variant="ghost" />
        </div>
      </header>

      {showConversations ? (
        <BrainConversationSwitcher
          conversations={brainState.conversations}
          currentId={brainState.currentId}
          onDelete={deleteConversation}
          onNew={startConversation}
          onSwitch={switchToConversation}
        />
      ) : (
        <div className="brain-panel__body" onScroll={onScroll} ref={bodyRef}>
          {loading && brainState.messages.length === 0 ? <EmptyState title="Loading Keeper" /> : null}
          {!loading && brainState.messages.length === 0 ? (
            <EmptyState
              icon={<Icon name="logo" size={24} />}
              title="Talk to The Keeper"
            >
              Ask for project status, agent progress, or coordination help.
            </EmptyState>
          ) : null}
          {brainState.messages.map((message) => (
            <BrainMessageRow key={message.id} message={message} />
          ))}
          {brainState.status === 'thinking' ? (
            <div className="brain-thinking">
              <span>thinking...</span>
              <Button icon="stop" onClick={abort} size="sm" variant="danger">
                Abort
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {!showConversations ? (
        <footer className="brain-panel__compose">
          <Textarea
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="Ask The Keeper"
            rows={2}
            value={input}
          />
          <Button
            disabled={!input.trim() || brainState.status === 'thinking'}
            icon="send"
            iconOnly
            onClick={submit}
            variant="primary"
          />
        </footer>
      ) : null}
    </section>
  );
};
