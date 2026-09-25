import { AUTH_COPY } from '../constants';

interface NotConfiguredNoticeProps {
  children?: never;
}

export const NotConfiguredNotice: React.FC<NotConfiguredNoticeProps> = () => (
  <div className="auth-notice" role="status">
    <strong>{AUTH_COPY.notConfigured.title}</strong>
    <p>{AUTH_COPY.notConfigured.body}</p>
    <a href="/">{AUTH_COPY.notConfigured.home}</a>
  </div>
);
