import { useCallback, useState } from 'react';

import { Button, EmptyState, Textarea } from '@/components';

import { CODEX_EFFORT_OPTIONS } from '../constants';
import { useCodexActions, useCodexAgentItems, useCodexModels } from '../hooks';
import type { CodexEffort } from '../types';
import { CodexItemList } from './CodexItemList';

export interface CodexAgentViewProps {
  agentId: string;
  focused?: boolean;
  visible?: boolean;
  onFocus?: () => void;
}

export const CodexAgentView: React.FC<CodexAgentViewProps> = ({
  agentId,
  visible = true,
  onFocus,
}) => {
  const [input, setInput] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [model, setModel] = useState('');
  const [effort, setEffort] = useState<CodexEffort | ''>('');
  const { clearItems, items } = useCodexAgentItems(agentId, visible);
  const { newThread, sendMessage } = useCodexActions(agentId);
  const modelsQuery = useCodexModels();
  const working = items.some((item) => item.status === 'running');

  const toggle = useCallback((id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }, []);

  const submit = useCallback(() => {
    const text = input.trim();

    if (!text) {
      return;
    }

    sendMessage(text, model, effort);
    setInput('');
  }, [effort, input, model, sendMessage]);

  const startThread = useCallback(() => {
    clearItems();
    setExpandedIds(new Set());
    newThread();
  }, [clearItems, newThread]);

  return (
    <section className="codex-view" onMouseDown={onFocus}>
      <header className="codex-toolbar">
        <select className="codex-select" onChange={(event) => setModel(event.target.value)} value={model}>
          <option value="">Model: default</option>
          {(modelsQuery.data ?? []).map((modelName) => (
            <option key={modelName} value={modelName}>
              {modelName}
            </option>
          ))}
        </select>
        <select
          className="codex-select"
          onChange={(event) => setEffort(event.target.value as CodexEffort | '')}
          value={effort}
        >
          <option value="">Reasoning: default</option>
          {CODEX_EFFORT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span className="codex-toolbar__spacer" />
        <Button icon="plus" onClick={startThread} size="sm" variant="ghost">
          New thread
        </Button>
      </header>
      {items.length === 0 ? (
        <EmptyState title="Waiting for Codex" />
      ) : (
        <CodexItemList expandedIds={expandedIds} items={items} onToggle={toggle} />
      )}
      {working ? <div className="codex-working">working...</div> : null}
      <footer className="codex-compose">
        <Textarea
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Message this Codex agent"
          rows={2}
          value={input}
        />
        <Button disabled={!input.trim()} icon="send" iconOnly onClick={submit} variant="primary" />
      </footer>
    </section>
  );
};
