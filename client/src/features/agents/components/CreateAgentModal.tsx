import { useCallback, useState } from 'react';

import { Button, FormField, Input, Modal, Textarea } from '@/components';

import { AGENT_CLI_OPTIONS, AGENT_FORM_FIELD_IDS } from '../constants';
import type { AgentCli, CreateAgentInput } from '../types';

export interface CreateAgentModalProps {
  open: boolean;
  loading?: boolean;
  projectCwd?: string;
  onClose: () => void;
  onCreate: (input: CreateAgentInput) => void;
}

export const CreateAgentModal: React.FC<CreateAgentModalProps> = ({
  open,
  loading = false,
  projectCwd = '',
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [cli, setCli] = useState<AgentCli>('claude');
  const [cwd, setCwd] = useState(projectCwd);
  const [role, setRole] = useState('');
  const [dangerouslySkipPermissions, setDangerouslySkipPermissions] = useState(false);
  const [remoteControl, setRemoteControl] = useState(false);

  const reset = useCallback(() => {
    setName('');
    setCli('claude');
    setCwd(projectCwd);
    setRole('');
    setDangerouslySkipPermissions(false);
    setRemoteControl(false);
  }, [projectCwd]);

  const close = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const submit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedName = name.trim();

      if (!trimmedName) {
        return;
      }

      onCreate({
        cli,
        cwd: cwd.trim() || undefined,
        flags: {
          dangerouslySkipPermissions,
          remoteControl,
        },
        name: trimmedName,
        role: role.trim() || undefined,
      });
      reset();
    },
    [cli, cwd, dangerouslySkipPermissions, name, onCreate, remoteControl, reset, role],
  );

  return (
    <Modal
      footer={
        <>
          <Button onClick={close} variant="ghost">
            Cancel
          </Button>
          <Button form="create-agent-form" loading={loading} type="submit" variant="primary">
            Create
          </Button>
        </>
      }
      onClose={close}
      open={open}
      title="Create Agent"
    >
      <form className="feature-form" id="create-agent-form" onSubmit={submit}>
        <FormField htmlFor={AGENT_FORM_FIELD_IDS.NAME} label="Name" required>
          <Input
            autoFocus
            id={AGENT_FORM_FIELD_IDS.NAME}
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </FormField>
        <div className="agent-cli-picker" role="radiogroup">
          {AGENT_CLI_OPTIONS.map((option) => (
            <label className="agent-cli-option" key={option.value}>
              <input
                checked={cli === option.value}
                onChange={() => setCli(option.value)}
                type="radio"
                value={option.value}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <FormField htmlFor={AGENT_FORM_FIELD_IDS.CWD} label="Working directory">
          <Input
            id={AGENT_FORM_FIELD_IDS.CWD}
            onChange={(event) => setCwd(event.target.value)}
            value={cwd}
          />
        </FormField>
        <FormField htmlFor={AGENT_FORM_FIELD_IDS.ROLE} label="Role">
          <Textarea
            id={AGENT_FORM_FIELD_IDS.ROLE}
            onChange={(event) => setRole(event.target.value)}
            rows={3}
            value={role}
          />
        </FormField>
        <label className="feature-checkbox">
          <input
            checked={dangerouslySkipPermissions}
            onChange={(event) => setDangerouslySkipPermissions(event.target.checked)}
            type="checkbox"
          />
          <span>Skip permission prompts</span>
        </label>
        <label className="feature-checkbox">
          <input
            checked={remoteControl}
            onChange={(event) => setRemoteControl(event.target.checked)}
            type="checkbox"
          />
          <span>Enable remote control</span>
        </label>
      </form>
    </Modal>
  );
};
