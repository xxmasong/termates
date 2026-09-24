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
const Illustration: React.FC<{ index: number; lines: readonly string[] }> = ({ index, lines }) => {
  if (index === 1)
    return (
      <div className="landing-agent-message">
        <div>
          <span className="landing-agent-message__pill landing-agent-message__pill--codex">
            codex
          </span>
          <i />
          <span className="landing-agent-message__pill landing-agent-message__pill--claude">
            claude
          </span>
        </div>
        <small>✉ orders API now returns {'{total, currency}'}</small>
      </div>
    );
  if (index === 3)
    return (
      <div className="landing-layout-glyphs">
        {[0, 1, 2, 3, 4].map((glyph) => (
          <span className={`landing-layout-glyph landing-layout-glyph--${glyph}`} key={glyph}>
            <i />
            <i />
            <i />
            <i />
          </span>
        ))}
        <span className="landing-phone">
          <i />
          <i />
          <i />
          <i />
        </span>
      </div>
    );
  if (index === 4)
    return (
      <div className="landing-usage-bars">
        {lines.map((line, lineIndex) => {
          const [label, value] = line.split(' ');
          return (
            <span
              className={`landing-usage-bars__row landing-usage-bars__row--${lineIndex}`}
              key={line}
            >
              <b>{label}</b>
              <i>
                <em style={{ width: value }} />
              </i>
              <strong>{value}</strong>
            </span>
          );
        })}
      </div>
    );
  if (index === 5)
    return (
      <div className="landing-feed-lines">
        {lines.map((line, lineIndex) => (
          <span
            className={`landing-feed-lines__row landing-feed-lines__row--${lineIndex}`}
            key={line}
          >
            {line}
          </span>
        ))}
      </div>
    );
  return (
    <>
      {lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </>
  );
};
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
        <Illustration index={index} lines={entry.lines} />
      </pre>
    </article>
  );
};
