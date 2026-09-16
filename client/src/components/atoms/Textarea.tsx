import type { TextareaHTMLAttributes } from 'react';

import { classNames } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({
  className,
  invalid = false,
  ...textareaProps
}) => (
  <textarea
    aria-invalid={invalid || undefined}
    className={classNames('textarea', className)}
    {...textareaProps}
  />
);
