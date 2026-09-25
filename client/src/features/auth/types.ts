export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_UNVERIFIED'
  | 'RATE_LIMITED'
  | 'EMAIL_TAKEN'
  | 'WEAK_PASSWORD'
  | 'SIGNUPS_CLOSED'
  | 'INVALID_INVITE'
  | 'ACCOUNT_SUSPENDED'
  | 'INVALID_TOKEN'
  | 'NOT_CONFIGURED'
  | 'NO_EMAIL'
  | 'CAPACITY';
export interface AuthError {
  error: string;
  code?: AuthErrorCode;
}
export interface FieldErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  name?: string;
  inviteCode?: string;
}

export type SignupMode = 'open' | 'invite';

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

/** GET /auth/config */
export type AuthConfig =
  | ({ configured: true; signupMode: SignupMode } & FirebaseWebConfig)
  | { configured: false; signupMode: SignupMode };

/** Plan + invite chosen at signup, kept until the first session exchange. */
export interface PendingSignup {
  plan?: string;
  inviteCode?: string;
}

export type OAuthProviderId = 'google' | 'github';

/** Where the Firebase config stands for the page being rendered. */
export type AuthConfigStatus = 'loading' | 'unconfigured' | 'ready';
