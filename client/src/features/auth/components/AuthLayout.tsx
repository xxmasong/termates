import type { ReactNode } from 'react';
import { Icon } from '@/components';
import { HiveSim } from '@/features/landing';
import { AUTH_COPY } from '../constants';
import '@/features/landing/styles.css';
import '../styles.css';
interface AuthLayoutProps {
  children: ReactNode;
}
export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => (
  <main className="auth">
    <section className="auth-main">
      <a className="auth-brand" href="/">
        <Icon name="logo" size={22} />
        TermHive
      </a>
      <div className="auth-content">{children}</div>
      <small>© 2026 TermHive</small>
    </section>
    <aside className="auth-panel">
      <HiveSim />
      <h2>{AUTH_COPY.panelTitle}</h2>
      <p>{AUTH_COPY.panelAgents}</p>
    </aside>
  </main>
);
