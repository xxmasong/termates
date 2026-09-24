import { COPY, FEATURE_ENTRIES } from '../constants';
import { FeatureCard } from './FeatureCard';
import { Section } from './Section';
interface FeatureBentoProps {
  children?: never;
}
export const FeatureBento: React.FC<FeatureBentoProps> = () => (
  <Section id="features" eyebrow={COPY.features.eyebrow} title={COPY.features.title}>
    <div className="landing-bento">
      {FEATURE_ENTRIES.map((entry) => (
        <FeatureCard entry={entry} key={entry.title} />
      ))}
    </div>
  </Section>
);
