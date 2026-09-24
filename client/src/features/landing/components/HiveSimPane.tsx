import type { SimPane } from '../types';
interface HiveSimPaneProps {
  pane: SimPane;
  lines: readonly string[];
  running: boolean;
  toast?: string;
}
export const HiveSimPane: React.FC<HiveSimPaneProps> = ({ pane, lines, running, toast }) => (
  <article className={`hive-pane hive-pane--${pane.id}`}>
    <header>
      <span className={`hive-dot${running ? ' hive-dot--running' : ''}`} />
      <strong>{pane.cli}</strong>
      <span>{pane.role}</span>
      <em>{running ? 'running' : pane.status}</em>
    </header>
    <pre>
      {lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </pre>
    {toast ? <p className="hive-toast">{toast}</p> : null}
  </article>
);
