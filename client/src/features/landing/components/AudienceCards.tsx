import { AUDIENCE_ENTRIES, COPY } from '../constants';
import { Icon } from '@/components';
import { Section } from './Section';

interface AudienceCardsProps {
  children?: never;
}

export const AudienceCards: React.FC<AudienceCardsProps> = () => (
  <Section eyebrow={COPY.audience.eyebrow} title={COPY.audience.title}>
    <div className="landing-audience">
      {AUDIENCE_ENTRIES.map((entry) => (
        <article key={entry.title}>
          <span className="landing-audience__icon">
            <Icon name="user" size={16} />
          </span>
          <h3>{entry.title}</h3>
          <p>{entry.body}</p>
        </article>
      ))}
    </div>
  </Section>
);
