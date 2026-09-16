import { useMemo } from 'react';

import { EmptyState, Icon } from '@/components';

import { useUsage } from '../hooks';

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

export interface UsageViewProps {
  children?: never;
}

export const UsageView: React.FC<UsageViewProps> = () => {
  const query = useUsage();
  const rows = useMemo(() => Object.entries(query.data ?? {}), [query.data]);

  return (
    <section className="usage-view">
      <h3>Usage</h3>
      {rows.length === 0 ? (
        <EmptyState icon={<Icon name="dollar" size={18} />} title={query.isLoading ? 'Loading usage' : 'No usage yet'} />
      ) : (
        <dl className="usage-view__grid">
          {rows.map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{formatValue(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
};

