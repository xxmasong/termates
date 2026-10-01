import { useCallback } from 'react';

import { Badge, Button } from '@/components';

import { ACCOUNT_COPY } from '../constants';
import type { PlanOption } from '../hooks/usePlanTab';

interface PlanCardProps {
  option: PlanOption;
  confirming: boolean;
  pending: boolean;
  onChoose: (option: PlanOption) => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({ option, confirming, pending, onChoose }) => {
  const { plan, action, overLimit } = option;
  const choose = useCallback(() => onChoose(option), [onChoose, option]);
  const label =
    action === 'current'
      ? ACCOUNT_COPY.currentPlan
      : action === 'upgrade'
        ? ACCOUNT_COPY.upgrade
        : confirming
          ? ACCOUNT_COPY.downgradeAnyway
          : ACCOUNT_COPY.downgrade;

  return (
    <article
      className={`account-plan${action === 'current' ? ' account-plan--current' : ''}${
        plan.highlighted ? ' account-plan--highlighted' : ''
      }`}
    >
      <header className="account-plan__header">
        <h4>{plan.name}</h4>
        {action === 'current' ? <Badge tone="attention">{ACCOUNT_COPY.currentPlan}</Badge> : null}
      </header>
      <p className="account-plan__price">
        <strong>{plan.price}</strong>
        <span>{plan.priceNote}</span>
      </p>
      <p className="account-plan__limits">{plan.limitsLine}</p>
      {confirming && overLimit ? <p className="account-plan__warning">{overLimit}</p> : null}
      <Button
        disabled={action === 'current'}
        loading={pending}
        onClick={choose}
        variant={action === 'upgrade' ? 'primary' : 'ghost'}
      >
        {label}
      </Button>
    </article>
  );
};
