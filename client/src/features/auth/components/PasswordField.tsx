import { useCallback, useState } from 'react';
import { TextField } from './TextField';
interface PasswordFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> { label?: string; error?: string; action?: React.ReactNode; }
export const PasswordField: React.FC<PasswordFieldProps> = ({ label = 'Password', ...props }) => { const [visible, setVisible] = useState(false); const toggle = useCallback(() => setVisible((value) => !value), []); return <div className="auth-password"><TextField label={label} type={visible ? 'text' : 'password'} {...props} /><button aria-label={visible ? 'Hide password' : 'Show password'} onClick={toggle} type="button">{visible ? 'Hide' : 'Show'}</button></div>; };
