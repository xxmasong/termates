import { RedirectTo } from './components';
import { AUTH_ROUTES } from './constants';
import { AccountActionPage } from './pages/AccountActionPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';

interface AuthRouteProps {
  pathname: string;
  navigate: (path: string) => void;
}

export const AuthRoute: React.FC<AuthRouteProps> = ({ pathname, navigate }) => {
  if (pathname === AUTH_ROUTES.LOGIN) return <LoginPage navigate={navigate} />;
  if (pathname === AUTH_ROUTES.SIGNUP) return <SignupPage navigate={navigate} />;
  if (pathname === AUTH_ROUTES.VERIFY) return <VerifyEmailPage />;
  if (pathname === AUTH_ROUTES.FORGOT) return <ForgotPasswordPage />;
  if (pathname === AUTH_ROUTES.RESET) {
    // Firebase links carry mode/oobCode; the old route forwards them.
    return <RedirectTo to={`${AUTH_ROUTES.ACTION}${window.location.search}`} />;
  }
  return <AccountActionPage />;
};
