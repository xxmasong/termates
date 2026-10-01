import { ConfirmDialog } from '@/components';
import type { Agent } from '@/types';

export interface DeleteAgentDialogProps {
  agent: Agent | null;
  loading?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (agent: Agent) => void;
}

export const DeleteAgentDialog: React.FC<DeleteAgentDialogProps> = ({
  agent,
  loading = false,
  error = null,
  onCancel,
  onConfirm,
}) => (
  <ConfirmDialog
    confirmLabel="Delete"
    danger
    loading={loading}
    message={
      agent
        ? `Delete "${agent.name}"? Its terminal session ends and it can't be restored. Files in its working directory are kept.`
        : ''
    }
    onCancel={onCancel}
    onConfirm={() => agent && onConfirm(agent)}
    open={Boolean(agent)}
    title="Delete Agent"
  >
    {error ? (
      <div className="feature-error" role="alert">
        {error}
      </div>
    ) : null}
  </ConfirmDialog>
);
