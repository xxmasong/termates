import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { BUTTON_ICON_SIZE } from '@/components/constants';
import { classNames } from '@/lib/utils';

import { Icon, type IconName } from './Icon';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconOnly?: boolean;
  loading?: boolean;
  children?: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'ghost',
  size = 'md',
  icon,
  iconOnly = false,
  loading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...buttonProps
}) => (
  <button
    className={classNames(
      'btn',
      `btn--${variant}`,
      `btn--${size}`,
      iconOnly && 'btn--icon-only',
      className,
    )}
    disabled={disabled || loading}
    type={type}
    {...buttonProps}
  >
    {loading ? <Spinner size={BUTTON_ICON_SIZE[size]} /> : null}
    {!loading && icon ? <Icon name={icon} size={BUTTON_ICON_SIZE[size]} /> : null}
    {children ? <span className={loading ? 'btn__label--loading' : undefined}>{children}</span> : null}
  </button>
);
