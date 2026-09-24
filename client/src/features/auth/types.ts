export type AuthErrorCode = 'INVALID_CREDENTIALS' | 'EMAIL_UNVERIFIED' | 'RATE_LIMITED' | 'EMAIL_TAKEN' | 'WEAK_PASSWORD' | 'SIGNUPS_CLOSED';
export interface AuthError { error: string; code?: AuthErrorCode; }
export interface FieldErrors { email?: string; password?: string; confirmPassword?: string; name?: string; }
