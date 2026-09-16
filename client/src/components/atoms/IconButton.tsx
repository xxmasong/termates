import type { ButtonHTMLAttributes } from 'react';

import { BUTTON_ICON_SIZE } from '@/components/constants';
import { classNames } from '@/lib/utils';

import { Icon, type IconName } from './Icon';

export type IconButtonTone = 'neutral' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  size?: IconButtonSize;
  tone?: IconButtonTone;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  size = 'md',
  tone = 'neutral',
  className,
  type = 'button',
  ...buttonProps
}) => (
  <button
    aria-label={label}
    className={classNames('icon-btn', `icon-btn--${size}`, tone === 'danger' && 'icon-btn--danger', className)}
    title={label}
    type={type}
    {...buttonProps}
  >
    <Icon className="icon-btn__icon" name={icon} size={BUTTON_ICON_SIZE[size]} />
  </button>
);
