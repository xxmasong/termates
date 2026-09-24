import { PASSWORD_RULES } from '../constants';

interface PasswordStrengthProps { password: string; email: string; }

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password, email }) => {
  const checks = [password.length >= 10, /[a-z]/i.test(password) && /\d/.test(password), !email || !password.toLowerCase().includes(email.toLowerCase())];
  return <ul className="auth-strength">{PASSWORD_RULES.map((rule, index) => <li className={checks[index] ? 'auth-strength--valid' : ''} key={rule}>{checks[index] ? '✓' : '○'} {rule}</li>)}</ul>;
};
