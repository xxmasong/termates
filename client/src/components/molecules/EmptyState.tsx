import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  children?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, children, icon, action }) => (
  <div className="empty-state">
    {icon ? <div className="empty-state__icon">{icon}</div> : null}
    <div className="empty-state__title">{title}</div>
    {children ? <div className="empty-state__body">{children}</div> : null}
    {action}
  </div>
);
