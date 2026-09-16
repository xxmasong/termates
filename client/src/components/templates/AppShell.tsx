import type { CSSProperties, ReactNode } from 'react';

import { classNames } from '@/lib/utils';

export interface AppShellProps {
  sidebar?: ReactNode;
  main: ReactNode;
  rightPanel?: ReactNode;
  sidebarCollapsed?: boolean;
  sidebarWidth?: number;
  rightPanelWidth?: number;
  className?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  sidebar,
  main,
  rightPanel,
  sidebarCollapsed = false,
  sidebarWidth = 232,
  rightPanelWidth = 0,
  className,
}) => (
  <div
    className={classNames('app-shell', sidebarCollapsed && 'app-shell--sidebar-collapsed', className)}
    style={
      {
        '--app-shell-right-width': rightPanel ? `${rightPanelWidth}px` : '0',
        '--app-shell-sidebar-width': `${sidebarWidth}px`,
      } as CSSProperties
    }
  >
    {sidebar}
    <main className="app-shell__main">{main}</main>
    {rightPanel ? <aside className="app-shell__right">{rightPanel}</aside> : null}
  </div>
);
