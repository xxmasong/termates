import type { ReactNode } from 'react';

import { classNames } from '@/lib/utils';

export interface ToolbarProps {
  children: ReactNode;
  align?: 'start' | 'between';
  className?: string;
}

export interface ToolbarGroupProps {
  children: ReactNode;
  className?: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({ children, align = 'start', className }) => (
  <div className={classNames('toolbar', align === 'between' && 'toolbar--between', className)}>
    {children}
  </div>
);

export const ToolbarGroup: React.FC<ToolbarGroupProps> = ({ children, className }) => (
  <div className={classNames('toolbar__group', className)}>{children}</div>
);
