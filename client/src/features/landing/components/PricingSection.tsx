import { PLANS } from '@/constants';
import { COPY } from '../constants';
import { PricingCard } from './PricingCard';
import { Section } from './Section';

interface PricingSectionProps {
  children?: never;
}

export const PricingSection: React.FC<PricingSectionProps> = () => (
  <Section id="pricing" eyebrow={COPY.pricing.eyebrow} title={COPY.pricing.title}>
    <p>{COPY.pricing.body}</p>
    <div className="landing-pricing">
      {PLANS.map((plan) => (
        <PricingCard key={plan.id} plan={plan} />
      ))}
    </div>
    <p className="landing-pricing__note">{COPY.pricing.note}</p>
  </Section>
);
