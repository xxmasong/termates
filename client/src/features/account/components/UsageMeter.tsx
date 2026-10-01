import { ACCOUNT_COPY } from '../constants';

const FULL = 100;

interface UsageMeterProps {
  label: string;
  hint?: string;
  used: number | undefined;
  limit: number | null | undefined;
}

/** "Agents  4 / 10" with a bar; unlimited plans show the count only. */
export const UsageMeter: React.FC<UsageMeterProps> = ({ label, hint, used, limit }) => {
  const pct =
    used === undefined || limit === null || limit === undefined || limit === 0
      ? 0
      : Math.min(FULL, Math.round((used / limit) * FULL));
  const tone = pct >= FULL ? 'full' : pct >= 80 ? 'high' : 'ok';

  return (
    <div className="account-usage">
      <div className="account-usage__row">
        <span className="account-usage__label">
          {label}
          {hint ? <small>{hint}</small> : null}
        </span>
        <span className="account-usage__value">
          {used ?? '–'}
          <span>/ {limit === null ? ACCOUNT_COPY.unlimited : (limit ?? '–')}</span>
        </span>
      </div>
      {limit === null ? null : (
        <div className="account-usage__bar">
          <div
            className={`account-usage__fill account-usage__fill--${tone}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
};
