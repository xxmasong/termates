export const ACCOUNT_API = {
  ME: '/auth/me',
  LOGOUT: '/auth/logout',
} as const;

export const ACCOUNT_ROUTES = {
  LOGIN: '/login',
  LANDING: '/',
  PRICING: '/#pricing',
} as const;

/** How often /auth/me is polled while the workspace is being prepared. */
export const PROVISIONING_POLL_MS = 2000;
export const ME_STALE_MS = 60_000;

export const PLAN_LIMIT_CODE = 'PLAN_LIMIT';

export const ACCOUNT_COPY = {
  preparingTitle: 'Preparing your workspace…',
  preparingBody: 'Setting up your own private hive. This only takes a few seconds.',
  errorTitle: "We couldn't start your workspace",
  errorBody: 'Please try again in a moment. If it keeps happening, let us know.',
  retry: 'Try again',
  signOut: 'Sign out',
  accountMenu: 'Account menu',
  admin: 'Admin',
  limitTitle: "You've reached your plan's limit",
  limitBody: (plan: string, limit: number, kind: 'project' | 'agent') =>
    `${plan} includes ${limit} ${kind === 'project' ? (limit === 1 ? 'project' : 'projects') : limit === 1 ? 'agent' : 'agents'}. Upgrade to add more.`,
  seePlans: 'See plans',
  close: 'Close',
} as const;
