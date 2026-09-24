import { COPY, HOW_STEPS } from '../constants';
import { Section } from './Section';
interface HowItWorksProps {
  children?: never;
}
export const HowItWorks: React.FC<HowItWorksProps> = () => (
  <Section id="how" eyebrow={COPY.how.eyebrow} title={COPY.how.title}>
    <ol className="landing-steps">
      {HOW_STEPS.map((step, index) => (
        <li key={step.title}>
          <b>{index + 1}</b>
          <h3>{step.title}</h3>
          <p>{step.body}</p>
        </li>
      ))}
    </ol>
  </Section>
);
