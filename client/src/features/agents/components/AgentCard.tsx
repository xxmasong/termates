import type { Agent } from '@/types';

import { Badge, Icon } from '@/components';

import { AGENT_CLI_OPTIONS } from '../constants';
import { AgentActions } from './AgentActions';
import { AgentStatusBadge } from './AgentStatusBadge';

export interface AgentCardProps {
  agent: Agent;
  selected: boolean;
  preview?: string;
  lifecycleBusy?: boolean;
  onSelect: (agentId: string) => void;
  onStart: (agent: Agent) => void;
  onStop: (agent: Agent) => void;
  onRestart: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  selected,
  preview,
  lifecycleBusy = false,
  onSelect,
  onStart,
  onStop,
  onRestart,
  onDelete,
}) => {
  const cliOption = AGENT_CLI_OPTIONS.find((option) => option.value === agent.cli);

  return (
    <article className={`agent-card${selected ? ' agent-card--selected' : ''}`}>
      <button className="agent-card__select" onClick={() => onSelect(agent.id)} type="button">
        <Icon name={cliOption?.icon ?? 'terminal'} size={16} />
        <span className="agent-card__body">
          <span className="agent-card__name">{agent.name}</span>
          <span className="agent-card__meta">{agent.cwd}</span>
        </span>
      </button>
      <div className="agent-card__status">
        <AgentStatusBadge status={agent.status} />
        <Badge>{cliOption?.label ?? agent.cli}</Badge>
      </div>
      {agent.role ? <p className="agent-card__role">{agent.role}</p> : null}
      {preview ? <pre className="agent-card__preview">{preview}</pre> : null}
      <AgentActions
        agent={agent}
        disabled={lifecycleBusy}
        onDelete={onDelete}
        onRestart={onRestart}
        onStart={onStart}
        onStop={onStop}
      />
    </article>
  );
};
