import { Button } from '@/components/atoms';

import { Modal } from './Modal';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  loading = false,
  onCancel,
  onConfirm,
}) => (
  <Modal
    footer={
      <>
        <Button onClick={onCancel} variant="ghost">
          {cancelLabel}
        </Button>
        <Button loading={loading} onClick={onConfirm} variant={danger ? 'danger' : 'primary'}>
          {confirmLabel}
        </Button>
      </>
    }
    onClose={onCancel}
    open={open}
    title={title}
    width={420}
  >
    <p>{message}</p>
  </Modal>
);
