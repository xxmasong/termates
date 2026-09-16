import type { CodexItem } from '@/types';

import { Badge, type BadgeTone } from '@/components';

export interface CodexStatusBadgeProps {
  status?: CodexItem['status'];
}

const STATUS_TONE: Record<NonNullable<CodexItem['status']>, BadgeTone> = {
  done: 'success',
  failed: 'danger',
  running: 'attention',
};

export const CodexStatusBadge: React.FC<CodexStatusBadgeProps> = ({ status }) => {
  if (!status) {
    return null;
  }

  return (
    <Badge tone={STATUS_TONE[status]} withDot={status === 'running'}>
      {status}
    </Badge>
  );
};
