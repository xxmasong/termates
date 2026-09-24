import { COPY } from '../constants';

interface WorksWithProps {
  children?: never;
}

export const WorksWith: React.FC<WorksWithProps> = () => (
  <section className="landing-works" aria-label={COPY.works.label}>
    <p>{COPY.works.label}</p>
    <div>
      {COPY.works.names.map((name) => (
        <span key={name}>{name}</span>
      ))}
    </div>
  </section>
);
