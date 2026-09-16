import { useId, type ReactNode } from 'react';

import { classNames } from '@/lib/utils';

export type TooltipPlacement = 'top' | 'right' | 'bottom' | 'left';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: TooltipPlacement;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
  className,
}) => {
  const tooltipId = useId();

  return (
    <span aria-describedby={tooltipId} className={classNames('tooltip', className)}>
      {children}
      <span
        className={classNames('tooltip__bubble', `tooltip__bubble--${placement}`)}
        id={tooltipId}
        role="tooltip"
      >
        {content}
      </span>
    </span>
  );
};
