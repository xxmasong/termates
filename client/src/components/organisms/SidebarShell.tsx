import { useCallback, type ReactNode } from 'react';

import { SIDEBAR_WIDTH } from '@/components/constants';
import { STORAGE_KEYS } from '@/constants';
import { useLocalStorage } from '@/lib/hooks';
import { classNames } from '@/lib/utils';

export interface SidebarShellProps {
  children: ReactNode;
  /** Controlled collapse state — the app header owns the toggle. */
  collapsed: boolean;
  storageKeyPrefix?: string;
  className?: string;
  defaultWidth?: number;
  onLayoutChange?: (layout: { collapsed: boolean; width: number }) => void;
}

const clampSidebarWidth = (width: number): number =>
  Math.max(SIDEBAR_WIDTH.MIN, Math.min(SIDEBAR_WIDTH.MAX, width));

export const SidebarShell: React.FC<SidebarShellProps> = ({
  children,
  collapsed,
  storageKeyPrefix = 'termhive',
  className,
  defaultWidth = SIDEBAR_WIDTH.DEFAULT,
  onLayoutChange,
}) => {
  const widthKey =
    storageKeyPrefix === 'termhive' ? STORAGE_KEYS.SIDEBAR_WIDTH : `${storageKeyPrefix}:sidebar-width`;
  const [width, setWidth] = useLocalStorage(widthKey, defaultWidth);

  // Tapping the scrim closes the drawer; the owner holds the state.
  const collapse = useCallback(() => {
    onLayoutChange?.({ collapsed: true, width });
  }, [onLayoutChange, width]);

  const startResize = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = width;

      const move = (moveEvent: MouseEvent): void => {
        const nextWidth = clampSidebarWidth(startWidth + moveEvent.clientX - startX);
        setWidth(nextWidth);
        onLayoutChange?.({ collapsed, width: nextWidth });
      };

      const up = (): void => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        document.body.style.cursor = '';
      };

      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
      document.body.style.cursor = 'col-resize';
    },
    [collapsed, onLayoutChange, setWidth, width],
  );

  return (
    <div
      className={classNames('sidebar-shell', collapsed && 'sidebar-shell--collapsed')}
      style={{ '--app-shell-sidebar-width': `${clampSidebarWidth(width)}px` } as React.CSSProperties}
    >
      {collapsed ? null : (
        <div aria-hidden className="sidebar-shell__scrim" onClick={collapse} />
      )}
      <aside
        className={classNames(
          'sidebar-shell__sidebar',
          collapsed && 'sidebar-shell__sidebar--collapsed',
          className,
        )}
      >
        {children}
      </aside>
      {collapsed ? null : (
        <div
          aria-hidden
          className="sidebar-shell__resizer"
          onMouseDown={startResize}
          style={{ left: `${clampSidebarWidth(width)}px` }}
        />
      )}
    </div>
  );
};
