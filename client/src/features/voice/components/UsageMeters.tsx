import { useMemo } from 'react';

import { useUsage } from '../hooks';
import { USAGE_METER_CLIS } from '../constants';

interface UsageMetersProps {
  children?: never;
}

/** "resets 3m" / "resets 4d" — the coarse form V1 shows. */
const formatReset = (resetsAt?: string): string => {
  if (!resetsAt) {
    return '';
  }

  const ms = new Date(resetsAt).getTime() - Date.now();

  if (!Number.isFinite(ms) || ms <= 0) {
    return 'now';
  }

  const minutes = Math.round(ms / 60000);

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.round(minutes / 60);

  return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
};

const barColor = (pct: number): string => {
  if (pct >= 90) {
    return 'var(--err)';
  }

  return pct >= 70 ? 'var(--attn)' : 'var(--accent)';
};

export const UsageMeters: React.FC<UsageMetersProps> = () => {
  const { data } = useUsage();

  const rows = useMemo(
    () =>
      USAGE_METER_CLIS.map((cli) => ({
        cli,
        session: data?.[cli.key]?.session,
        week: data?.[cli.key]?.week,
      })).filter((row) => row.session ?? row.week),
    [data],
  );

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="usage-meters">
      {rows.map((row) => (
        <div className="usage-meters__block" key={row.cli.key}>
          <div className="usage-meters__title">
            <span className="usage-meters__mark" style={{ background: row.cli.color }} />
            {row.cli.label}
          </div>
          {(['session', 'week'] as const).map((window) => {
            const entry = row[window];

            if (!entry) {
              return null;
            }

            const pct = Math.max(0, Math.min(100, Math.round(entry.utilization)));

            return (
              <div key={window}>
                <div className="usage-meters__row">
                  <span className="usage-meters__label">
                    {window === 'session' ? 'Session' : 'Week'}
                  </span>
                  <span className="usage-meters__pct">
                    {pct}%<span className="usage-meters__reset">· resets {formatReset(entry.resetsAt)}</span>
                  </span>
                </div>
                <div className="usage-meters__bar">
                  <div
                    className="usage-meters__fill"
                    style={{ background: barColor(pct), width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
