import { useCallback } from 'react';

import type { Agent } from '@/types';

import {
  AGENT_AUTOCOMPACT_OPTIONS,
  AGENT_EFFORT_OPTIONS,
  AGENT_MODEL_OPTIONS,
  AGENT_PERMISSION_MODES,
  AGENT_REMOTE_CONTROL_CLIS,
  AGENT_THINKING_ALWAYS_ON,
  AGENT_THINKING_OPTIONS,
} from '../constants';

export interface AgentModelBarProps {
  agent: Agent;
  /** Applying a change restarts the agent: a running CLI cannot be reconfigured. */
  onChange: (
    agent: Agent,
    patch: {
      model?: string;
      effort?: string;
      thinking?: string;
      permissionMode?: string;
      autocompact?: string;
      flags?: Agent['flags'];
    },
  ) => void;
}

export const AgentModelBar: React.FC<AgentModelBarProps> = ({ agent, onChange }) => {
  const models = AGENT_MODEL_OPTIONS[agent.cli] ?? [];
  const efforts = AGENT_EFFORT_OPTIONS[agent.cli] ?? [];
  const thinkingModes = AGENT_THINKING_OPTIONS[agent.cli] ?? [];
  const showsRemoteControl = AGENT_REMOTE_CONTROL_CLIS.includes(agent.cli);
  const permissionModes = AGENT_PERMISSION_MODES[agent.cli] ?? [];
  const autocompacts = AGENT_AUTOCOMPACT_OPTIONS[agent.cli] ?? [];
  // Some models think unconditionally, so offering "off" there would lie.
  const thinkingLocked =
    agent.cli === 'gemini' && AGENT_THINKING_ALWAYS_ON.includes(agent.model ?? '');

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

  const changeThinking = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(agent, { thinking: event.target.value });
  };

  const changeRemoteControl = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(agent, {
      flags: { ...agent.flags, remoteControl: event.target.value === 'on' },
    });
  };

  const changePermissionMode = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(agent, { permissionMode: event.target.value });
  };

  const changeAutocompact = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(agent, { autocompact: event.target.value });
  };

  if (
    models.length === 0 &&
    efforts.length === 0 &&
    permissionModes.length === 0 &&
    autocompacts.length === 0 &&
    thinkingModes.length === 0 &&
    !showsRemoteControl
  ) {
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
      {thinkingModes.length > 0 ? (
        <select
          className="agent-model-bar__select"
          disabled={thinkingLocked}
          onChange={changeThinking}
          title={
            thinkingLocked
              ? `${agent.model} always thinks; it cannot be turned off`
              : 'Thinking mode — applying restarts the agent'
          }
          value={thinkingLocked ? 'enabled' : (agent.thinking ?? '')}
        >
          <option value="">Thinking: default</option>
          {thinkingModes.map((mode) => (
            <option key={mode} value={mode}>
              Thinking: {mode}
            </option>
          ))}
        </select>
      ) : null}
      {permissionModes.length > 0 ? (
        <select
          className="agent-model-bar__select"
          onChange={changePermissionMode}
          title="Permission mode — applying restarts the agent"
          value={agent.permissionMode ?? ''}
        >
          <option value="">Permissions: default</option>
          {permissionModes.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      ) : null}
      {autocompacts.length > 0 ? (
        <select
          className="agent-model-bar__select"
          onChange={changeAutocompact}
          title="Auto-compact window — applying restarts the agent"
          value={agent.autocompact ?? ''}
        >
          <option value="">Compact: default</option>
          {autocompacts.map((value) => (
            <option key={value} value={value}>
              {value === 'auto' ? 'auto' : `${Number(value) / 1000}k`}
            </option>
          ))}
        </select>
      ) : null}
      {showsRemoteControl ? (
        <select
          className="agent-model-bar__select"
          onChange={changeRemoteControl}
          title="Remote control — applying restarts the agent"
          value={agent.flags?.remoteControl ? 'on' : 'off'}
        >
          <option value="off">Remote control: off</option>
          <option value="on">Remote control: on</option>
        </select>
      ) : null}
    </div>
  );
};
