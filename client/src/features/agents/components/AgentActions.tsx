import type { Agent } from '@/types';

import { IconButton } from '@/components';

export interface AgentActionsProps {
  agent: Agent;
  disabled?: boolean;
  onStart: (agent: Agent) => void;
  onStop: (agent: Agent) => void;
  onRestart: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
}

export const AgentActions: React.FC<AgentActionsProps> = ({
  agent,
  disabled = false,
  onStart,
  onStop,
  onRestart,
  onDelete,
}) => (
  <div className="agent-actions">
    {agent.status === 'stopped' ? (
      <IconButton disabled={disabled} icon="play" label="Start" onClick={() => onStart(agent)} size="sm" />
    ) : (
      <IconButton disabled={disabled} icon="stop" label="Stop" onClick={() => onStop(agent)} size="sm" />
    )}
    <IconButton
      disabled={disabled}
      icon="restart"
      label="Restart"
      onClick={() => onRestart(agent)}
      size="sm"
    />
    <IconButton
      disabled={disabled}
      icon="x"
      label="Delete"
      onClick={() => onDelete(agent)}
      size="sm"
      tone="danger"
    />
  </div>
);
