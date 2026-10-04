import { AGENT_MODEL_OPTIONS } from '@/features/agents';
import type { KeeperEngine } from '@/types';

import { KEEPER_ENGINE_COPY } from '../constants';
import { useBrainActions, useBrainState } from '../hooks';

export interface KeeperEngineBarProps {
  children?: never;
}

/** Which CLI (and model) runs the Keeper's next turn. */
export const KeeperEngineBar: React.FC<KeeperEngineBarProps> = () => {
  const { brainState } = useBrainState();
  const { setSettings } = useBrainActions();
  const { engine, engines, model, status } = brainState;
  const busy = status === 'thinking';
  const models = AGENT_MODEL_OPTIONS[engine].filter((option) => option !== 'default');
  const title = busy ? KEEPER_ENGINE_COPY.busy : undefined;

  if (engines.length === 0) {
    return null;
  }

  return (
    <div className="keeper-engine-bar">
      <select
        aria-label={KEEPER_ENGINE_COPY.engineLabel}
        className="agent-model-bar__select"
        disabled={busy}
        onChange={(event) => setSettings(event.target.value as KeeperEngine)}
        title={title ?? KEEPER_ENGINE_COPY.engineLabel}
        value={engine}
      >
        {engines.map((option) => (
          <option disabled={!option.available} key={option.id} value={option.id}>
            {option.available ? option.label : KEEPER_ENGINE_COPY.notInstalled(option.label)}
          </option>
        ))}
      </select>
      <select
        aria-label={KEEPER_ENGINE_COPY.modelLabel}
        className="agent-model-bar__select"
        disabled={busy}
        onChange={(event) => setSettings(engine, event.target.value)}
        title={title ?? KEEPER_ENGINE_COPY.modelLabel}
        value={model}
      >
        <option value="">{KEEPER_ENGINE_COPY.defaultModel}</option>
        {models.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        {model && !models.includes(model) ? <option value={model}>{model}</option> : null}
      </select>
    </div>
  );
};
