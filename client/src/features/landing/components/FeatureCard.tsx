import type { FeatureEntry } from '../types';
interface FeatureCardProps {
  entry: FeatureEntry;
}
const ICON_PATHS = [
  'M2 3h12v10H2zM5 6l2 2-2 2M9 10h3',
  'M2 3h9v7H6l-3 3v-3H2zM8 7h6v6h-3l-2 2v-2',
  'M4 2h7v10H4zM7 5h7v9H7z',
  'M2 2h12v12H2zM8 2v12M2 8h12',
  'M3 5h10v7H3zM5 5V3h6v2',
  'M2 8h3l2-4 2 7 2-4h3',
] as const;
export const FeatureCard: React.FC<FeatureCardProps> = ({ entry }) => {
  const index = [
    'Real terminals, not wrappers',
    'Agents that talk',
    'Shared memory',
    'Any layout, any device',
    'Pay nothing extra',
    'See every move',
  ].indexOf(entry.title);
  return (
    <article className={`landing-feature-card${entry.wide ? ' landing-feature-card--wide' : ''}`}>
      <span className="landing-feature-card__icon">
        <svg viewBox="0 0 16 16">
          <path d={ICON_PATHS[index]} />
        </svg>
      </span>
      <h3>{entry.title}</h3>
      <p>{entry.body}</p>
      <pre
        className={`landing-feature-card__illustration landing-feature-card__illustration--${index}`}
      >
        {entry.lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </pre>
    </article>
  );
};
