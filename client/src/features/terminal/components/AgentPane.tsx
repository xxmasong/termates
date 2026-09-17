import { useCallback, useMemo, type MouseEvent } from 'react';

import type { Agent } from '@/types';

import { Badge, Button, Icon } from '@/components';
import { agentHue, agentInitials } from '@/features/agents';
import { CodexAgentView } from '@/features/codex';
import { classNames } from '@/lib/utils';

import { AGENT_PANE_STATUS_LABELS, AGENT_PANE_STATUS_TONES } from '../constants';
import { AgentTerminal } from './AgentTerminal';

export interface AgentPaneProps {
  agent: Agent;
  focused: boolean;
  onDelete: (agent: Agent) => void;
  onFocus: (agentId: string) => void;
  onRestart: (agent: Agent) => void;
  onStart: (agent: Agent) => void;
  onStop: (agent: Agent) => void;
}

export const AgentPane: React.FC<AgentPaneProps> = ({
  agent,
  focused,
  onDelete,
  onFocus,
  onRestart,
  onStart,
  onStop,
}) => {
  const alive = agent.status !== 'stopped';
  const initials = useMemo(() => agentInitials(agent.name), [agent.name]);
  const hue = useMemo(() => agentHue(agent.name), [agent.name]);
  const focusPane = useCallback(() => onFocus(agent.id), [agent.id, onFocus]);
  const startAgent = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onStart(agent);
  }, [agent, onStart]);
  const stopAgent = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onStop(agent);
  }, [agent, onStop]);
  const restartAgent = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onRestart(agent);
  }, [agent, onRestart]);
  const deleteAgent = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onDelete(agent);
  }, [agent, onDelete]);

  return (
    <article className={classNames('agent-pane', focused && 'agent-pane--focused')} onMouseDown={focusPane}>
      <header className="agent-pane__header">
        <span className="agent-pane__drag" title="Drag pane">
          <Icon name="dots" size={12} />
        </span>
        <div className="agent-pane__identity">
          <span className="agent-pane__avatar" style={{ background: hue }}>
            {initials}
          </span>
          <div className="agent-pane__copy">
            <div className="agent-pane__title-row">
              <span className="agent-pane__name">{agent.name}</span>
              {agent.role ? <span className="agent-pane__role">{agent.role}</span> : null}
            </div>
            <span className="agent-pane__meta">{agent.cli} · {agent.cwd}</span>
          </div>
        </div>
        <Badge
          className={classNames('agent-pane__status', `agent-pane__status--${agent.status}`)}
          tone={AGENT_PANE_STATUS_TONES[agent.status]}
          withDot
        >
          {AGENT_PANE_STATUS_LABELS[agent.status]}
        </Badge>
        <div className="agent-pane__actions">
          {alive ? (
            <Button
              aria-label={`Stop ${agent.name}`}
              icon="stop"
              iconOnly
              onClick={stopAgent}
              size="sm"
              title="Stop"
              variant="ghost"
            />
          ) : (
            <Button
              aria-label={`Start ${agent.name}`}
              icon="play"
              iconOnly
              onClick={startAgent}
              size="sm"
              title="Start"
              variant="ghost"
            />
          )}
          <Button
            aria-label={`Restart ${agent.name}`}
            icon="restart"
            iconOnly
            onClick={restartAgent}
            size="sm"
            title="Restart"
            variant="ghost"
          />
          <Button
            aria-label={`Delete ${agent.name}`}
            icon="x"
            iconOnly
            onClick={deleteAgent}
            size="sm"
            title="Delete"
            variant="danger"
          />
        </div>
      </header>
      <div className="agent-pane__body">
        {alive ? (
          agent.cli === 'codex' ? (
            <CodexAgentView agentId={agent.id} focused={focused} onFocus={focusPane} />
          ) : (
            <AgentTerminal agentId={agent.id} focused={focused} onFocus={focusPane} />
          )
        ) : (
          <div className="agent-pane__stopped">
            <span className="agent-pane__stopped-label">agent stopped</span>
            <span className="agent-pane__stopped-meta">{agent.cli} · {agent.cwd}</span>
            <Button icon="play" onClick={startAgent} size="sm" variant="primary">
              Start agent
            </Button>
          </div>
        )}
      </div>
    </article>
  );
};
