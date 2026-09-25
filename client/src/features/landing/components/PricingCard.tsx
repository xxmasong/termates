import type { Plan } from '@/constants';
import { ROUTES } from '@/constants';
import { COPY, PRICING_INCLUDED } from '../constants';
import { PlanStat } from './PlanStat';

interface PricingCardProps {
  plan: Plan;
}

const PLAN_CTA: Record<Plan['id'], string> = {
  free: COPY.pricing.freeCta,
  pro: COPY.pricing.proCta,
  'pro-plus': COPY.pricing.proPlusCta,
};

const planHref = (plan: Plan): string =>
  plan.id === 'free' ? ROUTES.SIGNUP : `${ROUTES.SIGNUP}?plan=${plan.id}`;

export const PricingCard: React.FC<PricingCardProps> = ({ plan }) => (
  <article
    className={`landing-pricing-card${plan.highlighted ? ' landing-pricing-card--highlighted' : ''}`}
  >
    {plan.highlighted ? (
      <span className="landing-pricing-card__popular">{COPY.pricing.popular}</span>
    ) : null}
    <h3>{plan.name}</h3>
    <p>{plan.pitch}</p>
    <div className="landing-pricing-card__price">
      {plan.price ? (
        <>
          <strong>{plan.price}</strong>
          <span>{plan.priceNote}</span>
        </>
      ) : (
        <span className="landing-pricing-card__early-access">{COPY.pricing.earlyAccess}</span>
      )}
    </div>
    <div className="landing-pricing-card__chip-row">
      {plan.earlyAccess ? (
        <span className="landing-pricing-card__early-access">{COPY.pricing.noCharge}</span>
      ) : null}
    </div>
    <div className="landing-pricing-card__stats">
      <PlanStat label={plan.maxProjects === 1 ? 'project' : 'projects'} value={plan.maxProjects} />
      <PlanStat label="agents" value={plan.maxAgents} />
    </div>
    <a
      className={`landing-button ${plan.highlighted ? 'landing-button--primary' : 'landing-button--secondary'}`}
      href={planHref(plan)}
    >
      {PLAN_CTA[plan.id]}
    </a>
    <div className="landing-pricing-card__included">
      <h4>{COPY.pricing.includedTitle}</h4>
      <ul>
        {PRICING_INCLUDED.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  </article>
);
