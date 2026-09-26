import { useCallback, useState } from 'react';

import { ACTION_COPY } from '../constants';
import { FormError } from './FormError';
import { PasswordField } from './PasswordField';
import { PasswordStrength } from './PasswordStrength';
import { SubmitButton } from './SubmitButton';

interface ResetPasswordFormProps {
  email: string;
  pending: boolean;
  error?: string;
  passwordError?: string;
  confirmError?: string;
  onSubmit: (password: string, confirmation: string) => void;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  email,
  pending,
  error,
  passwordError,
  confirmError,
  onSubmit,
}) => {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const submit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      onSubmit(password, confirmation);
    },
    [confirmation, onSubmit, password],
  );

  return (
    <form noValidate onSubmit={submit}>
      <input autoComplete="username" hidden readOnly type="email" value={email} />
      <PasswordField
        autoComplete="new-password"
        error={passwordError}
        onChange={(event) => setPassword(event.target.value)}
        value={password}
      />
      <PasswordStrength email={email} password={password} />
      <PasswordField
        autoComplete="new-password"
        error={confirmError}
        id="confirm-password"
        label={ACTION_COPY.confirmPassword}
        onChange={(event) => setConfirmation(event.target.value)}
        value={confirmation}
      />
      {error ? <FormError>{error}</FormError> : null}
      <SubmitButton pending={pending}>{ACTION_COPY.updatePassword}</SubmitButton>
    </form>
  );
};
