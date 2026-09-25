import type { ReactNode } from 'react';
interface AuthCardProps {
  title: string;
  body?: ReactNode;
  children: ReactNode;
}
export const AuthCard: React.FC<AuthCardProps> = ({ title, body, children }) => (
  <section className="auth-card">
    <h1>{title}</h1>
    {body ? <p className="auth-card__body">{body}</p> : null}
    {children}
  </section>
);
