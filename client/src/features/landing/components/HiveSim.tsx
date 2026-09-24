import { COPY, SIM_PANES, SIM_STEPS } from '../constants';
import { useHiveSimulation } from '../hooks';
import { HiveSimPane } from './HiveSimPane';
import { KeeperHud } from './KeeperHud';
interface HiveSimProps {
  children?: never;
}
export const HiveSim: React.FC<HiveSimProps> = () => {
  const { step, reduced } = useHiveSimulation();
  const active = SIM_STEPS.slice(0, step + 1);
  const linesFor = (pane: (typeof SIM_PANES)[number]) => [
    ...pane.lines,
    ...active.filter((item) => item.paneId === pane.id).flatMap((item) => item.lines ?? []),
  ];
  const message = active.some((item) => item.message);
  const keeper = reduced || active.some((item) => item.keeper);
  return (
    <div aria-hidden="true" className="hive-sim">
      <header className="hive-sim__chrome">
        <i />
        <i />
        <i />
        <span>{COPY.sim.title}</span>
        <b>{COPY.sim.live}</b>
      </header>
      <div className="hive-sim__body">
        {SIM_PANES.map((pane) => (
          <HiveSimPane
            key={pane.id}
            lines={linesFor(pane)}
            pane={pane}
            running={active.at(-1)?.paneId === pane.id}
            toast={pane.id === 'claude' && message ? COPY.sim.toast : undefined}
          />
        ))}
        <svg
          className={`hive-message-path${message ? ' hive-message-path--visible' : ''}`}
          viewBox="0 0 100 100"
        >
          <defs>
            <marker
              id="hive-arrow"
              markerHeight="5"
              markerWidth="5"
              orient="auto"
              refX="4"
              refY="2.5"
            >
              <path d="M0 0 5 2.5 0 5z" />
            </marker>
          </defs>
          <path d="M50 58H4" markerEnd="url(#hive-arrow)" />
        </svg>
      </div>
      <KeeperHud message={COPY.sim.keeper} visible={keeper} />
    </div>
  );
};
