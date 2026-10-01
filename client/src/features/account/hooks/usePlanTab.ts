import { useCallback, useMemo, useState } from 'react';

import { PLANS, type Plan, type PlanId } from '@/constants';

import { ACCOUNT_COPY } from '../constants';
import type { Me, PlanUsage } from '../types';
import { useChangePlan } from './useChangePlan';
import { usePlanUsage } from './usePlanUsage';

export type PlanAction = 'current' | 'upgrade' | 'downgrade';

export interface PlanOption {
  plan: Plan;
  action: PlanAction;
  /** Why switching to this plan leaves the user over a limit, or null. */
  overLimit: string | null;
}

const rank = (id: PlanId): number => PLANS.findIndex((plan) => plan.id === id);

const overLimitMessage = (plan: Plan, usage: PlanUsage | undefined): string | null => {
  if (!usage) return null;
  if (plan.maxProjects !== null && usage.projects > plan.maxProjects) {
    return ACCOUNT_COPY.overLimit(usage.projects, plan.maxProjects, 'projects', plan.name);
  }
  if (usage.agents > plan.maxAgents) {
    return ACCOUNT_COPY.overLimit(usage.agents, plan.maxAgents, 'agents', plan.name);
  }
  return null;
};

/** Plan cards, live usage, and the change-plan flow (over-limit downgrades confirm first). */
export const usePlanTab = (me: Me | null | undefined, active: boolean) => {
  const usageQuery = usePlanUsage(active && me?.workspace.state === 'running');
  const changePlan = useChangePlan();
  const [confirming, setConfirming] = useState<PlanId | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const currentId = me?.plan.id ?? 'free';
  const options = useMemo<PlanOption[]>(
    () =>
      PLANS.map((plan) => ({
        plan,
        action:
          plan.id === currentId
            ? 'current'
            : rank(plan.id) > rank(currentId)
              ? 'upgrade'
              : 'downgrade',
        overLimit: plan.id === currentId ? null : overLimitMessage(plan, usageQuery.data),
      })),
    [currentId, usageQuery.data],
  );

  const choose = useCallback(
    (option: PlanOption) => {
      if (option.action === 'current') return;
      if (option.overLimit && confirming !== option.plan.id) {
        setConfirming(option.plan.id);
        return;
      }
      setConfirming(null);
      setMessage(null);
      changePlan.mutate(option.plan.id, {
        onError: () => setMessage(ACCOUNT_COPY.planError),
        onSuccess: () => setMessage(ACCOUNT_COPY.planChanged(option.plan.name)),
      });
    },
    [changePlan, confirming],
  );

  return {
    options,
    usage: usageQuery.data,
    usageUnavailable: usageQuery.isError,
    limits: me?.plan,
    confirming,
    choose,
    pendingPlan: changePlan.isPending ? changePlan.variables : null,
    message,
  };
};
