export const AUTH_COPY = {
  login: { title: 'Welcome back', body: 'Sign in to your hive.' },
  signup: { title: 'Create your hive', body: 'Free forever on one project. Upgrade anytime.' },
  verify: { title: 'Check your inbox', body: 'We sent a verification link to' },
  forgot: {
    title: 'Reset your password',
    body: "Enter your email and we'll send you a reset link.",
  },
  reset: { title: 'Choose a new password' },
  genericError: 'Something went wrong. Please try again.',
  notConfigured: {
    title: "Sign-in isn't configured yet",
    body: "TermHive accounts aren't switched on for this site yet. Check back soon.",
    home: 'Back to the homepage',
  },
  inviteRequired: 'Sign-ups are invite-only right now. Enter your invite code.',
  legal: 'By creating an account you agree to the Terms and Privacy Policy.',
  panelTitle: 'Four agents. One team. Zero copy-paste.',
  panelAgents: 'Claude Code · Codex · Gemini CLI · OpenCode',
} as const;
export const AUTH_ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  VERIFY: '/verify-email',
  FORGOT: '/forgot-password',
  RESET: '/reset-password',
  ACTION: '/account/action',
  APP: '/app',
} as const;

export const ACTION_MODES = {
  VERIFY_EMAIL: 'verifyEmail',
  RESET_PASSWORD: 'resetPassword',
} as const;

export const ACTION_COPY = {
  verifiedTitle: 'Email verified',
  verifiedBody: 'Your email is confirmed. Your hive is ready when you are.',
  continue: 'Continue',
  invalidTitle: 'This link has expired',
  invalidReset: 'This reset link is invalid or has expired.',
  invalidVerify: 'This verification link is invalid or has expired.',
  requestNew: 'Request a new one',
  backToSignIn: 'Back to sign in',
  updatePassword: 'Update password',
  passwordUpdated: 'Password updated.',
  signIn: 'Sign in',
  passwordsDontMatch: "Passwords don't match.",
  confirmPassword: 'Confirm password',
} as const;

export const AUTH_API = {
  CONFIG: '/auth/config',
  SESSION: '/auth/session',
} as const;

export const FIELD_REQUIRED = {
  email: 'Email is required.',
  password: 'Password is required.',
  name: 'Name is required.',
  inviteCode: 'Enter your invite code.',
} as const;

export const INVITE_FIELD_ID = 'invite-code';

export const WEAK_PASSWORD_MESSAGE = 'Choose a stronger password.';

export const PENDING_SIGNUP_STORAGE_KEY = 'termhive.pendingSignup';

/** Firebase error codes → the brief's messages. Missing codes → generic. */
export const FIREBASE_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  'auth/invalid-credential': "That email and password don't match.",
  'auth/wrong-password': "That email and password don't match.",
  'auth/user-not-found': "That email and password don't match.",
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Choose a stronger password.',
  'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
  'auth/user-disabled': 'This account is suspended.',
  'auth/popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups and try again.',
  'auth/account-exists-with-different-credential':
    'This email already uses a different sign-in method. Use that one instead.',
  'auth/expired-action-code': 'This link is invalid or has expired.',
  'auth/invalid-action-code': 'This link is invalid or has expired.',
};

/** Firebase codes that mean the user closed the popup — no message. */
export const SILENT_FIREBASE_ERRORS: readonly string[] = [
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
];

/** /auth/session error codes → messages. */
export const SESSION_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  EMAIL_UNVERIFIED: 'Please verify your email first.',
  RATE_LIMITED: 'Too many attempts. Try again in a few minutes.',
  SIGNUPS_CLOSED: 'Sign-ups are invite-only right now. Enter your invite code.',
  INVALID_INVITE: 'That invite code is invalid or used up.',
  ACCOUNT_SUSPENDED: 'This account is suspended.',
  INVALID_TOKEN: 'Your sign-in expired. Please sign in again.',
  NOT_CONFIGURED: "Sign-in isn't configured yet.",
  NO_EMAIL: 'Your account needs an email address to use TermHive.',
  CAPACITY: 'TermHive is full right now. Please try again later.',
};

/** Session errors that are fixed by entering an invite code. */
export const INVITE_ERROR_CODES: readonly string[] = ['SIGNUPS_CLOSED', 'INVALID_INVITE'];
export const PASSWORD_RULES = [
  'At least 10 characters',
  'A letter and a number',
  'Not your email',
] as const;
export const RESEND_COOLDOWN_SECONDS = 60;

export const VERIFY_COPY = {
  resend: 'Resend email',
  resendIn: (seconds: number) => `Resend in ${seconds}s`,
  sent: 'Sent. Check your spam folder too.',
  confirm: "I've verified my email",
  notYetVerified:
    "We haven't seen the confirmation yet. Click the link in the email, then try again.",
  signedOut: 'Sign in again to resend the email or continue.',
  fallbackEmail: 'your email',
  backToSignIn: 'Back to sign in',
} as const;
