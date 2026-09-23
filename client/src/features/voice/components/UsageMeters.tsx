import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components';

import { useAuth, useLogoutCli, useUsage } from '../hooks';
import { AuthModal } from './AuthModal';
import {
  USAGE_APPROXIMATE_CLIS,
  USAGE_METER_CLIS,
  USAGE_SESSION_LABELS,
} from '../constants';

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
  const authQuery = useAuth();
  const logoutMutation = useLogoutCli();
  const [authCli, setAuthCli] = useState<{ key: string; label: string } | null>(null);

  const closeAuth = useCallback(() => setAuthCli(null), []);
  const logout = useCallback(
    (cli: string) => logoutMutation.mutate(cli),
    [logoutMutation],
  );

  const rows = useMemo(
    () =>
      USAGE_METER_CLIS.map((cli) => ({
        cli,
        session: data?.[cli.key]?.session,
        week: data?.[cli.key]?.week,
      })).filter((row) => row.session != null || row.week != null),
    [data],
  );

  if (rows.length === 0) {
    return null;
  }

  return (
    <>
    <div className="usage-meters">
      {rows.map((row) => (
        <div className="usage-meters__block" key={row.cli.key}>
          <div className="usage-meters__title">
            <span className="usage-meters__mark" style={{ background: row.cli.color }} />
            {row.cli.label}
            {USAGE_APPROXIMATE_CLIS.has(row.cli.key) ? (
              <span
                className="usage-meters__approx"
                title="Counted locally from this machine's CLI logs against the published daily limit — Google exposes no quota API"
              >
                ~
              </span>
            ) : null}
            <Button
              aria-label={`${row.cli.label} account`}
              className="usage-meters__gear"
              icon="gear"
              iconOnly
              onClick={() => setAuthCli({ key: row.cli.key, label: row.cli.label })}
              size="sm"
              title={`${row.cli.label} account`}
              variant="ghost"
            />
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
                    {window === 'session'
                      ? (USAGE_SESSION_LABELS[row.cli.key] ?? 'Session')
                      : 'Week'}
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
    <AuthModal
      auth={authCli ? authQuery.data?.[authCli.key] : undefined}
      cli={authCli}
      error={logoutMutation.error instanceof Error ? logoutMutation.error.message : null}
      loading={authQuery.isLoading}
      loggingOut={logoutMutation.isPending}
      onClose={closeAuth}
      onLogout={logout}
    />
    </>
  );
};
