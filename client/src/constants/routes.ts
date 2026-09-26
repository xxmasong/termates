export const ROUTES = {
  LANDING: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  ACCOUNT: '/account',
  APP: '/app',
} as const;

/** Paths rendered by the lazily loaded auth feature. */
export const AUTH_PATHS: readonly string[] = [
  ROUTES.LOGIN,
  ROUTES.SIGNUP,
  ROUTES.VERIFY_EMAIL,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
];

export const isAuthPath = (pathname: string): boolean =>
  AUTH_PATHS.includes(pathname) || pathname.startsWith(`${ROUTES.ACCOUNT}/`);
