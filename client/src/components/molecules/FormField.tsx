import { useId, type ReactNode } from 'react';

export interface FormFieldProps {
  label: string;
  children: ReactNode;
  error?: string;
  required?: boolean;
  htmlFor?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  children,
  error,
  required = false,
  htmlFor,
}) => {
  const generatedId = useId();
  const errorId = `${generatedId}-error`;

  return (
    <label className="form-field" htmlFor={htmlFor}>
      <span className="form-field__label">
        {label}
        {required ? <span className="form-field__required">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="form-field__error" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  );
};
