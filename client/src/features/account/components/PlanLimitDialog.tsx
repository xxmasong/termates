import { useCallback } from 'react';

import { Button, Modal } from '@/components';

import { ACCOUNT_COPY } from '../constants';
import { useAccountModal } from '../hooks/useAccountModal';
import { useMe } from '../hooks/useMe';
import { usePlanLimitDialog } from '../hooks/usePlanLimitDialog';
import { planName } from '../utils';

const DIALOG_WIDTH = 420;

interface PlanLimitDialogProps {
  children?: never;
}

/** "You've reached your plan's limit" — shown when a create returns PLAN_LIMIT. */
export const PlanLimitDialog: React.FC<PlanLimitDialogProps> = () => {
  const { limit, close } = usePlanLimitDialog();
  const { data: me } = useMe();
  const { open } = useAccountModal();
  const seePlans = useCallback(() => {
    close();
    open('plan');
  }, [close, open]);

  return (
    <Modal
      footer={
        <>
          <Button onClick={close} variant="ghost">
            {ACCOUNT_COPY.close}
          </Button>
          <Button onClick={seePlans} variant="primary">
            {ACCOUNT_COPY.seePlans}
          </Button>
        </>
      }
      onClose={close}
      open={Boolean(limit)}
      title={ACCOUNT_COPY.limitTitle}
      width={DIALOG_WIDTH}
    >
      {limit ? (
        <p>{ACCOUNT_COPY.limitBody(planName(me?.plan.id ?? ''), limit.limit, limit.kind)}</p>
      ) : null}
    </Modal>
  );
};
