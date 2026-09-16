import type { ReactNode } from 'react';

import { Badge } from '@/components/atoms';
import { classNames } from '@/lib/utils';

export interface TabBarItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  count?: number;
}

export interface TabBarProps {
  items: TabBarItem[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  className?: string;
}

export const TabBar: React.FC<TabBarProps> = ({
  items,
  activeId,
  onChange,
  ariaLabel = 'Tabs',
  className,
}) => (
  <div aria-label={ariaLabel} className={classNames('tab-bar', className)} role="tablist">
    {items.map((item) => (
      <button
        aria-selected={item.id === activeId}
        className={classNames('tab-bar__tab', item.id === activeId && 'tab-bar__tab--active')}
        key={item.id}
        onClick={() => onChange(item.id)}
        role="tab"
        type="button"
      >
        {item.icon}
        <span>{item.label}</span>
        {item.count !== undefined ? <Badge>{item.count}</Badge> : null}
      </button>
    ))}
  </div>
);
