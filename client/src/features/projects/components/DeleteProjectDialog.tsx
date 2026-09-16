import { useCallback, useState } from 'react';

import { ConfirmDialog } from '@/components';
import type { Project } from '@/types';

import { PROJECT_DELETE_DEFAULT_REMOVE_DATA } from '../constants';

export interface DeleteProjectDialogProps {
  project: Project | null;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (projectId: string, removeData: boolean) => void;
}

export const DeleteProjectDialog: React.FC<DeleteProjectDialogProps> = ({
  project,
  loading = false,
  onCancel,
  onConfirm,
}) => {
  const [removeData, setRemoveData] = useState(PROJECT_DELETE_DEFAULT_REMOVE_DATA);

  const confirm = useCallback(() => {
    if (project) {
      onConfirm(project.id, removeData);
      setRemoveData(PROJECT_DELETE_DEFAULT_REMOVE_DATA);
    }
  }, [onConfirm, project, removeData]);

  const cancel = useCallback(() => {
    setRemoveData(PROJECT_DELETE_DEFAULT_REMOVE_DATA);
    onCancel();
  }, [onCancel]);

  return (
    <ConfirmDialog
      confirmLabel="Delete"
      danger
      loading={loading}
      message={project ? `Delete "${project.name}" from TermHive?` : ''}
      onCancel={cancel}
      onConfirm={confirm}
      open={Boolean(project)}
      title="Delete Project"
    >
      {project ? (
        <label className="project-delete-option">
          <input
            checked={removeData}
            onChange={(event) => setRemoveData(event.target.checked)}
            type="checkbox"
          />
          <span>Remove project data from disk</span>
        </label>
      ) : null}
    </ConfirmDialog>
  );
};
