import { COMPARISON_ROWS, COPY } from '../constants';
import { Section } from './Section';
const HEADERS = ['TermHive', 'Single-agent CLIs', 'AI IDEs', 'Cloud agents', 'Parallel runners'];
const SYMBOLS = { yes: '✓', partial: '◐', no: '—' } as const;
const LABELS = { yes: 'Yes', partial: 'Partially', no: 'No' } as const;
interface ComparisonTableProps {
  children?: never;
}
export const ComparisonTable: React.FC<ComparisonTableProps> = () => (
  <Section id="compare" eyebrow={COPY.compare.eyebrow} title={COPY.compare.title}>
    <p>{COPY.compare.body}</p>
    <div className="landing-comparison">
      <table>
        <thead>
          <tr>
            <th>Capability</th>
            {HEADERS.map((header) => (
              <th className={header === 'TermHive' ? 'landing-comparison__ours' : ''} key={header}>
                {header}
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
                  {SYMBOLS[value]}
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
