import { COPY } from '../constants';
import { useInView } from '../hooks';
import { Section } from './Section';

const CARDS = [0, 1, 2, 3];
interface ProblemSectionProps {
  children?: never;
}
export const ProblemSection: React.FC<ProblemSectionProps> = () => {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <Section id="product" eyebrow={COPY.problem.eyebrow} title={COPY.problem.title}>
      <p>{COPY.problem.body}</p>
      <div
        className={`landing-problem__visual${inView ? ' landing-problem__visual--ready' : ''}`}
        ref={ref}
      >
        {CARDS.map((card) => (
          <article key={card}>
            <header>terminal</header>
            <p>● session ended</p>
          </article>
        ))}
      </div>
      <small>{COPY.problem.caption}</small>
    </Section>
  );
};
