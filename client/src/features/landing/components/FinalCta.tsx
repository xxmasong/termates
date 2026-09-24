import { ROUTES } from '@/constants';
import { COPY } from '../constants';
import { HexPattern } from './HexPattern';

interface FinalCtaProps {
  children?: never;
}

export const FinalCta: React.FC<FinalCtaProps> = () => (
  <section className="landing-final-cta">
    <HexPattern />
    <h2>{COPY.cta.title}</h2>
    <p>{COPY.cta.body}</p>
    <div className="landing-actions">
      <a className="landing-button landing-button--primary" href={ROUTES.SIGNUP}>
        {COPY.cta.primary}
      </a>
      <a className="landing-button landing-button--secondary" href={ROUTES.LOGIN}>
        {COPY.signIn}
      </a>
    </div>
  </section>
);
