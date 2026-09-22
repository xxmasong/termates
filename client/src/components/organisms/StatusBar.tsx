import { classNames } from '@/lib/utils';

export interface StatusBarCount {
  /** Maps to a status dot colour: running | awaiting_input | idle | stopped. */
  tone: 'running' | 'awaiting_input' | 'idle' | 'stopped';
  label: string;
  value: number;
}

export interface StatusBarProps {
  counts?: StatusBarCount[];
  connected: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ counts = [], connected }) => (
  <footer className="status-bar">
    <div className="status-bar__group">
      {counts
        .filter((count) => count.value > 0 || count.tone === 'running')
        .map((count) => (
          <span
            className={classNames('status-bar__item', `status-bar__item--${count.tone}`)}
            key={count.tone}
          >
            <span className={classNames('status-dot', `status-dot--${count.tone}`)} />
            {count.value} {count.label}
          </span>
        ))}
    </div>
    <div className="status-bar__group">
      <span
        className={classNames(
          'status-bar__item',
          connected ? 'status-bar__item--ok' : 'status-bar__item--stopped',
        )}
      >
        ws · {connected ? 'connected' : 'offline'}
      </span>
    </div>
  </footer>
);
