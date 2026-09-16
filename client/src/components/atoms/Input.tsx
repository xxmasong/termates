import type { InputHTMLAttributes } from 'react';

import { classNames } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input: React.FC<InputProps> = ({ className, invalid = false, ...inputProps }) => (
  <input aria-invalid={invalid || undefined} className={classNames('input', className)} {...inputProps} />
);
