import type { FeatureEntry } from '../types';
interface FeatureCardProps {
  entry: FeatureEntry;
}
export const FeatureCard: React.FC<FeatureCardProps> = ({ entry }) => (
  <article className={`landing-feature-card${entry.wide ? ' landing-feature-card--wide' : ''}`}>
    <span className="landing-feature-card__icon">⌁</span>
    <h3>{entry.title}</h3>
    <p>{entry.body}</p>
    <pre className="landing-feature-card__illustration">
      {entry.lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </pre>
  </article>
);
