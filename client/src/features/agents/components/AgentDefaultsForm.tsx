import { useCallback } from 'react';

import { FormField, Input } from '@/components';

import { AGENT_CLI_OPTIONS, AGENT_DEFAULTS_COPY, AGENT_DEFAULTS_FIELD_IDS } from '../constants';
import { useAgentDefaults } from '../hooks/useAgentDefaults';
import type { AgentCli } from '../types';

interface AgentDefaultsFormProps {
  children?: never;
}

/** Defaults for the New agent form; every change saves immediately. */
export const AgentDefaultsForm: React.FC<AgentDefaultsFormProps> = () => {
  const { defaults, update } = useAgentDefaults();

  const onCli = useCallback((cli: AgentCli) => update({ cli }), [update]);
  const onRole = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => update({ role: event.target.value }),
    [update],
  );
  const onRemote = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => update({ remoteControl: event.target.checked }),
    [update],
  );

  return (
    <div className="feature-form">
      <FormField label={AGENT_DEFAULTS_COPY.cli}>
        <div aria-label={AGENT_DEFAULTS_COPY.cli} className="agent-cli-picker" role="radiogroup">
          {AGENT_CLI_OPTIONS.map((option) => (
            <label className="agent-cli-option" key={option.value}>
              <input
                checked={defaults.cli === option.value}
                onChange={() => onCli(option.value)}
                type="radio"
                value={option.value}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </FormField>
      <FormField htmlFor={AGENT_DEFAULTS_FIELD_IDS.ROLE} label={AGENT_DEFAULTS_COPY.role}>
        <Input
          id={AGENT_DEFAULTS_FIELD_IDS.ROLE}
          onChange={onRole}
          placeholder={AGENT_DEFAULTS_COPY.rolePlaceholder}
          value={defaults.role}
        />
      </FormField>
      <label className="feature-checkbox">
        <input checked={defaults.remoteControl} onChange={onRemote} type="checkbox" />
        <span>{AGENT_DEFAULTS_COPY.remoteControl}</span>
      </label>
    </div>
  );
};
