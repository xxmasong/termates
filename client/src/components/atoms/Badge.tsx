import type { ReactNode } from 'react';

import { classNames } from '@/lib/utils';

export type BadgeTone = 'neutral' | 'attention' | 'success' | 'danger' | 'idle';

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  withDot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  tone = 'neutral',
  withDot = false,
  className,
}) => (
  <span className={classNames('badge', `badge--${tone}`, className)}>
    {withDot ? <span className="badge__dot" /> : null}
    {children}
  </span>
);
