import type { RefObject } from 'react';
import type { SimPane } from '../types';
interface HiveSimPaneProps {
  pane: SimPane;
  lines: readonly string[];
  running: boolean;
  toast?: string;
  paneRef?: RefObject<HTMLElement>;
  toastRef?: RefObject<HTMLParagraphElement>;
}
export const HiveSimPane: React.FC<HiveSimPaneProps> = ({
  pane,
  lines,
  running,
  toast,
  paneRef,
  toastRef,
}) => (
  <article className={`hive-pane hive-pane--${pane.id}`} ref={paneRef}>
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
    {toast ? (
      <p className="hive-toast" ref={toastRef}>
        {toast}
      </p>
    ) : null}
  </article>
);
