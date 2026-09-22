import { useCallback, useEffect, useMemo, useState } from 'react';

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

/** The launch settings the bar can change, as stored on the agent. */
export interface AgentLaunchSettings {
  model: string;
  effort: string;
  thinking: string;
  permissionMode: string;
  autocompact: string;
  remoteControl: boolean;
}

export const readLaunchSettings = (agent: Agent): AgentLaunchSettings => ({
  autocompact: agent.autocompact ?? '',
  effort: agent.effort ?? '',
  model: agent.model ?? '',
  permissionMode: agent.permissionMode ?? '',
  remoteControl: Boolean(agent.flags?.remoteControl),
  thinking: agent.thinking ?? '',
});

export const launchSettingsEqual = (a: AgentLaunchSettings, b: AgentLaunchSettings): boolean =>
  a.model === b.model &&
  a.effort === b.effort &&
  a.thinking === b.thinking &&
  a.permissionMode === b.permissionMode &&
  a.autocompact === b.autocompact &&
  a.remoteControl === b.remoteControl;

export interface AgentModelBarProps {
  agent: Agent;
  /**
   * Staged settings are held by the pane, not applied here: selecting an
   * option must not restart the agent on its own.
   */
  draft: AgentLaunchSettings;
  onDraftChange: (next: AgentLaunchSettings) => void;
}

export const AgentModelBar: React.FC<AgentModelBarProps> = ({
  agent,
  draft,
  onDraftChange,
}) => {
  const models = AGENT_MODEL_OPTIONS[agent.cli] ?? [];
  const efforts = AGENT_EFFORT_OPTIONS[agent.cli] ?? [];
  const thinkingModes = AGENT_THINKING_OPTIONS[agent.cli] ?? [];
  const showsRemoteControl = AGENT_REMOTE_CONTROL_CLIS.includes(agent.cli);
  const permissionModes = AGENT_PERMISSION_MODES[agent.cli] ?? [];
  const autocompacts = AGENT_AUTOCOMPACT_OPTIONS[agent.cli] ?? [];
  // Some models think unconditionally, so offering "off" there would lie.
  const thinkingLocked =
    agent.cli === 'gemini' && AGENT_THINKING_ALWAYS_ON.includes(draft.model);

  const set = useCallback(
    (patch: Partial<AgentLaunchSettings>) => onDraftChange({ ...draft, ...patch }),
    [draft, onDraftChange],
  );

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
          onChange={(event) => set({ model: event.target.value })}
          title="Model"
          value={draft.model}
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
          onChange={(event) => set({ effort: event.target.value })}
          title="Reasoning effort"
          value={draft.effort}
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
          onChange={(event) => set({ thinking: event.target.value })}
          title={
            thinkingLocked
              ? `${draft.model} always thinks; it cannot be turned off`
              : 'Thinking mode'
          }
          value={thinkingLocked ? 'enabled' : draft.thinking}
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
          onChange={(event) => set({ permissionMode: event.target.value })}
          title="Permission mode"
          value={draft.permissionMode}
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
          onChange={(event) => set({ autocompact: event.target.value })}
          title="Auto-compact window"
          value={draft.autocompact}
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
          onChange={(event) => set({ remoteControl: event.target.value === 'on' })}
          title="Remote control"
          value={draft.remoteControl ? 'on' : 'off'}
        >
          <option value="off">Remote control: off</option>
          <option value="on">Remote control: on</option>
        </select>
      ) : null}
    </div>
  );
};

/** Keeps a draft in sync with the agent until the user edits it. */
export const useLaunchSettingsDraft = (agent: Agent) => {
  const saved = useMemo(() => readLaunchSettings(agent), [agent]);
  const [draft, setDraft] = useState<AgentLaunchSettings>(saved);

  // Adopt values that changed on the server (another client, a reset) only
  // while the user has nothing staged, so typing is never overwritten.
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) setDraft(saved);
  }, [dirty, saved]);

  const onDraftChange = useCallback(
    (next: AgentLaunchSettings) => {
      setDraft(next);
      setDirty(!launchSettingsEqual(next, saved));
    },
    [saved],
  );

  const reset = useCallback(() => {
    setDraft(saved);
    setDirty(false);
  }, [saved]);

  return { dirty, draft, onDraftChange, reset, saved };
};
