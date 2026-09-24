import { COMPARISON_HEADERS, COMPARISON_ROWS, COPY } from '../constants';
import { Section } from './Section';
const LABELS = { yes: 'Yes', partial: 'Partially', no: 'No' } as const;
const ComparisonIcon: React.FC<{ value: keyof typeof LABELS }> = ({ value }) => (
  <svg aria-hidden="true" className="landing-comparison__icon" viewBox="0 0 14 14">
    {value === 'yes' ? (
      <path d="m2 7 3 3 7-7" />
    ) : value === 'partial' ? (
      <>
        <circle cx="7" cy="7" r="5" />
        <path d="M7 2a5 5 0 0 0 0 10Z" fill="currentColor" stroke="none" />
      </>
    ) : (
      <path d="M3 7h8" />
    )}
  </svg>
);
interface ComparisonTableProps {
  children?: never;
}
export const ComparisonTable: React.FC<ComparisonTableProps> = () => (
  <Section id="compare" eyebrow={COPY.compare.eyebrow} title={COPY.compare.title}>
    <p>{COPY.compare.body}</p>
    <p className="landing-comparison__hint">{COPY.faq.hint}</p>
    <div className="landing-comparison">
      <table>
        <thead>
          <tr>
            <th>Capability</th>
            {COMPARISON_HEADERS.map((header, index) => (
              <th className={index === 0 ? 'landing-comparison__ours' : ''} key={header.title}>
                <span>{header.title}</span>
                <small>{header.subtitle}</small>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row) => (
            <tr key={row.label}>
              <th>{row.label}</th>
              {row.values.map((value, index) => (
                <td
                  aria-label={LABELS[value]}
                  className={index === 0 ? 'landing-comparison__ours' : ''}
                  key={index}
                >
                  <ComparisonIcon value={value} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <small>{COPY.compare.footnote}</small>
  </Section>
);
