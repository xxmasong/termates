import { useCallback, useState } from 'react';

import { Button, FormField, Input, Modal, Textarea } from '@/components';

import { PROJECT_FORM_FIELD_IDS } from '../constants';
import type { CreateProjectInput } from '../types';

export interface CreateProjectModalProps {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onCreate: (input: CreateProjectInput) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  open,
  loading = false,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [cwd, setCwd] = useState('');
  const [description, setDescription] = useState('');

  const reset = useCallback(() => {
    setName('');
    setCwd('');
    setDescription('');
  }, []);

  const close = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const submit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedName = name.trim();
      const trimmedCwd = cwd.trim();
      const trimmedDescription = description.trim();

      if (!trimmedName || !trimmedCwd) {
        return;
      }

      onCreate({
        cwd: trimmedCwd,
        description: trimmedDescription || undefined,
        name: trimmedName,
      });
      reset();
    },
    [cwd, description, name, onCreate, reset],
  );

  return (
    <Modal
      footer={
        <>
          <Button onClick={close} variant="ghost">
            Cancel
          </Button>
          <Button form="create-project-form" loading={loading} type="submit" variant="primary">
            Create
          </Button>
        </>
      }
      onClose={close}
      open={open}
      title="Create Project"
    >
      <form className="feature-form" id="create-project-form" onSubmit={submit}>
        <FormField htmlFor={PROJECT_FORM_FIELD_IDS.NAME} label="Name" required>
          <Input
            autoFocus
            id={PROJECT_FORM_FIELD_IDS.NAME}
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </FormField>
        <FormField htmlFor={PROJECT_FORM_FIELD_IDS.CWD} label="Working directory" required>
          <Input
            id={PROJECT_FORM_FIELD_IDS.CWD}
            onChange={(event) => setCwd(event.target.value)}
            required
            value={cwd}
          />
        </FormField>
        <FormField htmlFor={PROJECT_FORM_FIELD_IDS.DESCRIPTION} label="Description">
          <Textarea
            id={PROJECT_FORM_FIELD_IDS.DESCRIPTION}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            value={description}
          />
        </FormField>
      </form>
    </Modal>
  );
};
