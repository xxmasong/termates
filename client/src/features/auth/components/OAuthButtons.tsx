interface OAuthButtonsProps { mode: 'login' | 'signup'; plan?: string; invite?: string; }

const GoogleMark: React.FC = () => <svg aria-hidden="true" className="auth-oauth__mark" viewBox="0 0 18 18"><text fill="currentColor" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="700" x="1" y="14">G</text></svg>;
const GitHubMark: React.FC = () => <svg aria-hidden="true" className="auth-oauth__mark" fill="currentColor" viewBox="0 0 16 16"><path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.5c-2.23.49-2.7-.95-2.7-.95-.36-.93-.89-1.18-.89-1.18-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.23 1.87.88 2.33.67.07-.52.28-.88.51-1.08-1.78-.2-3.65-.89-3.65-3.96 0-.88.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .68-.22 2.2.82A7.7 7.7 0 0 1 8 4.8c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.52.56.83 1.27.83 2.15 0 3.08-1.87 3.75-3.65 3.95.29.25.54.73.54 1.47v2.18c0 .21.15.46.55.38A8 8 0 0 0 8 0Z" /></svg>;

export const OAuthButtons: React.FC<OAuthButtonsProps> = ({ mode, plan, invite }) => {
  const parameters = new URLSearchParams();
  if (plan) parameters.set('plan', plan);
  if (invite) parameters.set('invite', invite);
  const query = parameters.size ? `?${parameters.toString()}` : '';
  const verb = mode === 'login' ? 'Continue with' : 'Sign up with';
  return <div className="auth-oauth"><a href={`/auth/google${query}`}><GoogleMark />{verb} Google</a><a href={`/auth/github${query}`}><GitHubMark />{verb} GitHub</a></div>;
};
