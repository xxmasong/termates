import type { RefObject } from 'react';
import type { SimPane } from '../types';
interface TeamSimPaneProps {
  pane: SimPane;
  lines: readonly string[];
  running: boolean;
  toast?: string;
  paneRef?: RefObject<HTMLElement>;
  toastRef?: RefObject<HTMLParagraphElement>;
}
export const TeamSimPane: React.FC<TeamSimPaneProps> = ({
  pane,
  lines,
  running,
  toast,
  paneRef,
  toastRef,
}) => (
  <article
    className={`team-pane team-pane--${pane.id}${toast ? ' team-pane--has-toast' : ''}`}
    ref={paneRef}
  >
    <header>
      <span className={`team-dot${running ? ' team-dot--running' : ''}`} />
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
      <p className="team-toast" ref={toastRef}>
        {toast}
      </p>
    ) : null}
  </article>
);
