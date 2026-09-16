import type { ReactNode } from 'react';

export type NotificationTone = 'info' | 'success' | 'warning' | 'error';

export interface NotificationItem {
  id: string;
  title: string;
  message?: ReactNode;
  tone?: NotificationTone;
}

export interface NotificationHostProps {
  items: NotificationItem[];
}

export const NotificationHost: React.FC<NotificationHostProps> = ({ items }) => (
  <div aria-live="polite" className="notification-host">
    {items.map((item) => (
      <div className={`notification notification--${item.tone ?? 'info'}`} key={item.id}>
        <div className="notification__title">{item.title}</div>
        {item.message ? <div className="notification__message">{item.message}</div> : null}
      </div>
    ))}
  </div>
);
