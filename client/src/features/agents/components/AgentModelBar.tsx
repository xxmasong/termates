import { useCallback } from 'react';

import type { Agent } from '@/types';

import { AGENT_EFFORT_OPTIONS, AGENT_MODEL_OPTIONS } from '../constants';

export interface AgentModelBarProps {
  agent: Agent;
  /** Applying a change restarts the agent: a running CLI cannot be reconfigured. */
  onChange: (agent: Agent, patch: { model?: string; effort?: string }) => void;
}

export const AgentModelBar: React.FC<AgentModelBarProps> = ({ agent, onChange }) => {
  const models = AGENT_MODEL_OPTIONS[agent.cli] ?? [];
  const efforts = AGENT_EFFORT_OPTIONS[agent.cli] ?? [];

  const changeModel = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(agent, { model: event.target.value });
    },
    [agent, onChange],
  );

  const changeEffort = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(agent, { effort: event.target.value });
    },
    [agent, onChange],
  );

  if (models.length === 0 && efforts.length === 0) {
    return null;
  }

  return (
    <div className="agent-model-bar" onMouseDown={(event) => event.stopPropagation()}>
      {models.length > 0 ? (
        <select
          className="agent-model-bar__select"
          onChange={changeModel}
          title="Model — applying restarts the agent"
          value={agent.model ?? ''}
        >
          <option value="">Model: default</option>
          {models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      ) : null}
      {efforts.length > 0 ? (
        <select
          className="agent-model-bar__select"
          onChange={changeEffort}
          title="Reasoning effort — applying restarts the agent"
          value={agent.effort ?? ''}
        >
          <option value="">Reasoning: default</option>
          {efforts.map((effort) => (
            <option key={effort} value={effort}>
              {effort}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
};
