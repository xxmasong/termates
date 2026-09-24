import { AUDIENCE_ENTRIES, COPY } from '../constants';
import { Section } from './Section';

interface AudienceCardsProps {
  children?: never;
}

export const AudienceCards: React.FC<AudienceCardsProps> = () => (
  <Section eyebrow={COPY.audience.eyebrow} title={COPY.audience.title}>
    <div className="landing-audience">
      {AUDIENCE_ENTRIES.map((entry, index) => (
        <article key={entry.title}>
          <span className="landing-audience__icon">
            <svg viewBox="0 0 16 16">
              {index === 0 ? (
                <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5 6c0-2.5 2.2-4 5-4s5 1.5 5 4" />
              ) : index === 1 ? (
                <path d="M6 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm5-1a1.7 1.7 0 1 0 0-3.4M2 14c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5m.5-3c2 .1 3.5 1.2 3.5 3" />
              ) : (
                <path d="M6 2h4M7 2v4l-4 6h10L9 6V2M5.5 10h5" />
              )}
            </svg>
          </span>
          <h3>{entry.title}</h3>
          <p>{entry.body}</p>
        </article>
      ))}
    </div>
  </Section>
);
