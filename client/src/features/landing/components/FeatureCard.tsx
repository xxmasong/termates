import type { FeatureEntry } from '../types';
interface FeatureCardProps {
  entry: FeatureEntry;
}
export const FeatureCard: React.FC<FeatureCardProps> = ({ entry }) => (
  <article className={`landing-feature-card${entry.wide ? ' landing-feature-card--wide' : ''}`}>
    <h3>{entry.title}</h3>
    <p>{entry.body}</p>
    <pre>
      {entry.lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </pre>
  </article>
);
