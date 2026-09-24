import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LoginPage } from './pages/LoginPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SignupPage } from './pages/SignupPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';

interface AuthRouteProps { pathname: string; navigate: (path: string) => void; }

export const AuthRoute: React.FC<AuthRouteProps> = ({ pathname, navigate }) => { if (pathname === '/login') return <LoginPage />; if (pathname === '/signup') return <SignupPage navigate={navigate} />; if (pathname === '/verify-email') return <VerifyEmailPage />; if (pathname === '/forgot-password') return <ForgotPasswordPage />; return <ResetPasswordPage />; };
