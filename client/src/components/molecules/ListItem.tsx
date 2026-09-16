import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { classNames } from '@/lib/utils';

export interface ListItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  media?: ReactNode;
  action?: ReactNode;
  selected?: boolean;
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  description,
  media,
  action,
  selected = false,
  className,
  type = 'button',
  ...buttonProps
}) => (
  <button
    className={classNames('list-item', selected && 'list-item--selected', className)}
    type={type}
    {...buttonProps}
  >
    {media ? <span className="list-item__media">{media}</span> : null}
    <span className="list-item__content">
      <span className="list-item__title">{title}</span>
      {description ? <span className="list-item__description">{description}</span> : null}
    </span>
    {action ? <span className="list-item__action">{action}</span> : null}
  </button>
);
