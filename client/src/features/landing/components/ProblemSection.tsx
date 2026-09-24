import { COPY, PROBLEM_TERMINALS } from '../constants';
import { useInView } from '../hooks';
import { Section } from './Section';

interface ProblemSectionProps {
  children?: never;
}
export const ProblemSection: React.FC<ProblemSectionProps> = () => {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <Section id="product" eyebrow={COPY.problem.eyebrow} title={COPY.problem.title}>
      <div className="landing-problem">
        <div>
          <p>{COPY.problem.body}</p>
        </div>
        <div>
          <div
            className={`landing-problem__visual${inView ? ' landing-problem__visual--ready' : ''}`}
            ref={ref}
          >
            {PROBLEM_TERMINALS.map((terminal) => (
              <article
                className={`landing-problem__terminal landing-problem__terminal--${terminal.cli}`}
                key={terminal.cli}
              >
                <header>
                  <i />
                  <span>{terminal.cli}</span>
                </header>
                <pre>
                  {terminal.lines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </pre>
                <p>● session ended</p>
              </article>
            ))}
          </div>
          <small>{COPY.problem.caption}</small>
        </div>
      </div>
    </Section>
  );
};
