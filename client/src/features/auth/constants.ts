export const AUTH_COPY = {
  login: { title: 'Welcome back', body: 'Sign in to your hive.' },
  signup: { title: 'Create your hive', body: 'Free forever on one project. Upgrade anytime.' },
  verify: { title: 'Check your inbox', body: 'We sent a verification link to' },
  forgot: { title: 'Reset your password', body: "Enter your email and we'll send you a reset link." },
  reset: { title: 'Choose a new password' },
  genericError: 'Something went wrong. Please try again.',
  inviteRequired: 'Sign-ups are invite-only right now. Enter your invite code.',
  legal: 'By creating an account you agree to the Terms and Privacy Policy.',
  panelTitle: 'Four agents. One team. Zero copy-paste.',
  panelAgents: 'Claude Code · Codex · Gemini CLI · OpenCode',
} as const;
export const AUTH_ROUTES = {
  LOGIN: '/login', SIGNUP: '/signup', VERIFY: '/verify-email', FORGOT: '/forgot-password', RESET: '/reset-password',
} as const;
export const PASSWORD_RULES = ['At least 10 characters', 'A letter and a number', 'Not your email'] as const;
export const RESEND_COOLDOWN_SECONDS = 60;
