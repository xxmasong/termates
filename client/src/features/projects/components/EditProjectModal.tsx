import { useCallback, useEffect, useState } from 'react';

import { Button, FormField, Input, Modal, Textarea } from '@/components';
import type { Project } from '@/types';

import { PROJECT_EDIT_FORM_FIELD_IDS } from '../constants';
import type { UpdateProjectInput } from '../types';

export interface EditProjectModalProps {
  project: Project | null;
  loading?: boolean;
  onClose: () => void;
  onSave: (projectId: string, input: UpdateProjectInput) => void;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  project,
  loading = false,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [cwd, setCwd] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setCwd(project.cwd);
      setDescription(project.description ?? '');
    }
  }, [project]);

  const submit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!project) {
        return;
      }

      const trimmedName = name.trim();
      const trimmedCwd = cwd.trim();
      const trimmedDescription = description.trim();

      if (!trimmedName || !trimmedCwd) {
        return;
      }

      onSave(project.id, {
        cwd: trimmedCwd,
        description: trimmedDescription,
        name: trimmedName,
      });
    },
    [cwd, description, name, onSave, project],
  );

  return (
    <Modal
      footer={
        <>
          <Button onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button form="edit-project-form" loading={loading} type="submit" variant="primary">
            Save
          </Button>
        </>
      }
      onClose={onClose}
      open={Boolean(project)}
      title="Edit Project"
    >
      <form className="feature-form" id="edit-project-form" onSubmit={submit}>
        <FormField htmlFor={PROJECT_EDIT_FORM_FIELD_IDS.NAME} label="Name" required>
          <Input
            autoFocus
            id={PROJECT_EDIT_FORM_FIELD_IDS.NAME}
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </FormField>
        <FormField htmlFor={PROJECT_EDIT_FORM_FIELD_IDS.CWD} label="Working directory" required>
          <Input
            id={PROJECT_EDIT_FORM_FIELD_IDS.CWD}
            onChange={(event) => setCwd(event.target.value)}
            required
            value={cwd}
          />
        </FormField>
        <FormField htmlFor={PROJECT_EDIT_FORM_FIELD_IDS.DESCRIPTION} label="Description">
          <Textarea
            id={PROJECT_EDIT_FORM_FIELD_IDS.DESCRIPTION}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            value={description}
          />
        </FormField>
      </form>
    </Modal>
  );
};
