import { useId, type ReactNode } from 'react';

export interface FormFieldProps {
  label: string;
  children: ReactNode;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  /**
   * The children are several controls (a radio group) rather than one, so the
   * field is a labelled group: a label may only hold one control.
   */
  group?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  children,
  error,
  required = false,
  htmlFor,
  group = false,
}) => {
  const generatedId = useId();
  const errorId = `${generatedId}-error`;
  const labelId = `${generatedId}-label`;

  const content = (
    <>
      <span className="form-field__label" id={labelId}>
        {label}
        {required ? <span className="form-field__required">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="form-field__error" id={errorId}>
          {error}
        </span>
      ) : null}
    </>
  );

  return group ? (
    <div aria-labelledby={labelId} className="form-field" role="group">
      {content}
    </div>
  ) : (
    <label className="form-field" htmlFor={htmlFor}>
      {content}
    </label>
  );
};
