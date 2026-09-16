import type { ReactNode } from 'react';

import { classNames } from '@/lib/utils';

export interface KbdProps {
  children: ReactNode;
  className?: string;
}

export const Kbd: React.FC<KbdProps> = ({ children, className }) => (
  <kbd className={classNames('kbd', className)}>{children}</kbd>
);
