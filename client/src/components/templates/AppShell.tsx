import type { CSSProperties, ReactNode } from 'react';

import { classNames } from '@/lib/utils';

export interface AppShellProps {
  header?: ReactNode;
  sidebar?: ReactNode;
  main: ReactNode;
  rightPanel?: ReactNode;
  statusBar?: ReactNode;
  sidebarCollapsed?: boolean;
  sidebarWidth?: number;
  rightPanelWidth?: number;
  className?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  header,
  sidebar,
  main,
  rightPanel,
  statusBar,
  sidebarCollapsed = false,
  sidebarWidth = 232,
  rightPanelWidth = 0,
  className,
}) => (
  <div
    className={classNames(
      'app-shell',
      header && 'app-shell--with-header',
      statusBar && 'app-shell--with-status',
      sidebarCollapsed && 'app-shell--sidebar-collapsed',
      className,
    )}
    style={
      {
        '--app-shell-right-width': rightPanel ? `${rightPanelWidth}px` : '0',
        '--app-shell-sidebar-width': `${sidebarWidth}px`,
      } as CSSProperties
    }
  >
    {header}
    {sidebar}
    <main className="app-shell__main">{main}</main>
    {rightPanel ? <aside className="app-shell__right">{rightPanel}</aside> : null}
    {statusBar}
  </div>
);
