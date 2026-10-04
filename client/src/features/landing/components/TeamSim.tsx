import { useRef } from 'react';
import { COPY, SIM_PANES, SIM_STEPS } from '../constants';
import { useTeamSimulation, useMessagePath } from '../hooks';
import { TeamSimPane } from './TeamSimPane';
import { KeeperHud } from './KeeperHud';
interface TeamSimProps {
  children?: never;
}
export const TeamSim: React.FC<TeamSimProps> = () => {
  const { step, reduced } = useTeamSimulation();
  const active = SIM_STEPS.slice(0, step + 1);
  const linesFor = (pane: (typeof SIM_PANES)[number]) => [
    ...pane.lines,
    ...active.filter((item) => item.paneId === pane.id).flatMap((item) => item.lines ?? []),
  ];
  const message = active.some((item) => item.message);
  const keeper = reduced || active.some((item) => item.keeper);
  const gridRef = useRef<HTMLDivElement>(null);
  const toastRef = useRef<HTMLParagraphElement>(null);
  const codexRef = useRef<HTMLElement>(null);
  const path = useMessagePath(gridRef, toastRef, codexRef, message);
  return (
    <div aria-hidden="true" className="team-sim">
      <header className="team-sim__chrome">
        <i />
        <i />
        <i />
        <span>{COPY.sim.title}</span>
        <b>{COPY.sim.live}</b>
      </header>
      <div className="team-sim__body" ref={gridRef}>
        {SIM_PANES.map((pane) => (
          <TeamSimPane
            key={pane.id}
            lines={linesFor(pane)}
            pane={pane}
            running={active.at(-1)?.paneId === pane.id}
            toast={pane.id === 'claude' && message ? COPY.sim.toast : undefined}
            paneRef={pane.id === 'codex' ? codexRef : undefined}
            toastRef={pane.id === 'claude' ? toastRef : undefined}
          />
        ))}
        {path.d ? (
          <svg
            className="team-message-path team-message-path--visible"
            viewBox={`0 0 ${path.width} ${path.height}`}
          >
            <defs>
              <marker
                id="team-arrow"
                markerHeight="5"
                markerWidth="5"
                orient="auto"
                refX="4"
                refY="2.5"
              >
                <path d="M0 0 5 2.5 0 5z" />
              </marker>
            </defs>
            <path d={path.d} markerEnd="url(#team-arrow)" />
          </svg>
        ) : null}
      </div>
      <KeeperHud message={COPY.sim.keeper} visible={keeper} />
    </div>
  );
};
