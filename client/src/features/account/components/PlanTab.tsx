import { ACCOUNT_COPY } from '../constants';
import type { PlanOption } from '../hooks/usePlanTab';
import type { Me, PlanUsage } from '../types';
import { PlanCard } from './PlanCard';
import { UsageMeter } from './UsageMeter';

interface PlanTabProps {
  options: PlanOption[];
  usage: PlanUsage | undefined;
  usageUnavailable: boolean;
  limits: Me['plan'] | undefined;
  confirming: string | null;
  pendingPlan: string | null | undefined;
  message: string | null;
  onChoose: (option: PlanOption) => void;
}

export const PlanTab: React.FC<PlanTabProps> = ({
  options,
  usage,
  usageUnavailable,
  limits,
  confirming,
  pendingPlan,
  message,
  onChoose,
}) => (
  <div className="account-tab">
    <section className="account-section">
      <h3>{ACCOUNT_COPY.usageTitle}</h3>
      {usageUnavailable ? (
        <p className="account-muted">{ACCOUNT_COPY.usageUnavailable}</p>
      ) : (
        <div className="account-usage-grid">
          <UsageMeter
            label={ACCOUNT_COPY.projects}
            limit={limits?.maxProjects}
            used={usage?.projects}
          />
          <UsageMeter
            hint={ACCOUNT_COPY.agentsHint}
            label={ACCOUNT_COPY.agents}
            limit={limits?.maxAgents}
            used={usage?.agents}
          />
        </div>
      )}
    </section>

    <section className="account-plans" aria-label="Plans">
      {options.map((option) => (
        <PlanCard
          confirming={confirming === option.plan.id}
          key={option.plan.id}
          onChoose={onChoose}
          option={option}
          pending={pendingPlan === option.plan.id}
        />
      ))}
    </section>
    {message ? (
      <p className="account-message" role="status">
        {message}
      </p>
    ) : null}
    <p className="account-muted account-plans__note">{ACCOUNT_COPY.earlyAccess}</p>
  </div>
);
