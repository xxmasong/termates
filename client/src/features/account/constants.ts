export const ACCOUNT_API = {
  ME: '/auth/me',
  LOGOUT: '/auth/logout',
  LOGOUT_ALL: '/auth/logout-all',
  PLAN: '/auth/plan',
  USAGE: '/auth/usage',
} as const;

export const ACCOUNT_MODAL_WIDTH = 760;

export const ACCOUNT_TABS = [
  { id: 'plan', label: 'Plan & usage' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'agents', label: 'Agent defaults' },
  { id: 'account', label: 'Account' },
] as const;

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
  settingsItem: 'Plan & settings',
  upgradeItem: 'Upgrade plan',
  modalTitle: 'Account & settings',
  usageTitle: 'Your usage',
  projects: 'Projects',
  agents: 'Agents',
  agentsHint: 'across all projects, running or stopped',
  unlimited: 'Unlimited',
  usageUnavailable: "Usage isn't available while your workspace is starting.",
  currentPlan: 'Current plan',
  upgrade: 'Upgrade',
  downgrade: 'Downgrade',
  downgradeAnyway: 'Downgrade anyway',
  earlyAccess: 'No charge during early access — paid plans are free while billing is off.',
  overLimit: (used: number, limit: number, noun: string, plan: string) =>
    `You have ${used} ${noun}; ${plan} includes ${limit}. Nothing is deleted, but you can't add more until you're under the limit.`,
  planChanged: (plan: string) => `You're now on ${plan}.`,
  planError: "Couldn't change your plan. Please try again.",
  themeTitle: 'Appearance',
  themeLabel: 'Color theme',
  voiceTitle: 'Voice & speech',
  voiceBody: 'Speech provider, language, wake word and the Keeper’s voice.',
  voiceButton: 'Open voice settings',
  agentsTitle: 'New agent defaults',
  agentsBody: 'The New agent form starts from these. Saved in this browser.',
  accountTitle: 'Profile',
  workspaceTitle: 'Workspace',
  workspaceState: 'Status',
  sessionsTitle: 'Sessions',
  signOutEverywhere: 'Sign out of all devices',
  signOutEverywhereBody: 'Ends every TermHive session for your account, including this one.',
} as const;
