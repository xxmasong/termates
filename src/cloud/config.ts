/**
 * config.ts — control-plane settings, all from the environment
 * (termhive-cloud.service loads /etc/termhive/cloud.env).
 */

export type PlanId = 'free' | 'pro' | 'pro-plus';

export interface PlanLimits {
  id: PlanId;
  /** null = unlimited */
  maxProjects: number | null;
  maxAgents: number;
}

/** Plan limits — must match client/src/constants/plans.ts. */
export const PLANS: Readonly<Record<PlanId, PlanLimits>> = {
  free: { id: 'free', maxProjects: 1, maxAgents: 3 },
  pro: { id: 'pro', maxProjects: 3, maxAgents: 10 },
  'pro-plus': { id: 'pro-plus', maxProjects: null, maxAgents: 30 },
};

export const isPlanId = (value: unknown): value is PlanId =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(PLANS, value);

export type SignupMode = 'open' | 'invite';

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

export interface CloudConfig {
  host: string;
  port: number;
  dbPath: string;
  clientDist: string;
  /** Origins allowed to make state-changing requests (CSRF check). */
  allowedOrigins: string[];
  cookieSecure: boolean;
  signupMode: SignupMode;
  adminEmails: string[];
  firebase: FirebaseWebConfig | null;
  /** Where per-workspace env files live (root 0700). */
  wsEnvDir: string;
  /** Root-owned, world-readable plan limits per workspace (TERMHIVE_LIMITS_FILE). */
  wsLimitsDir: string;
  repoDir: string;
  /** Allows `termhive-admin dev-session`. Never on in production. */
  devSessions: boolean;
}

/** The existing root workspace (termhive2.service) the first admin inherits. */
export const ROOT_WORKSPACE = {
  unixUser: 'root',
  portBase: 4000,
  unit: 'termhive2.service',
} as const;
export const PORT_STEP = 10;
export const PORT_BASE_MIN = 4010;
export const PORT_BASE_MAX = 4990;
export const UID_MIN = 20000;
export const UID_MAX = 29999;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_COOKIE = 'th_session';
/** firebase_uid of users created by `termhive-admin create-admin` before Firebase exists. */
export const LOCAL_UID_PREFIX = 'local:';
export const LOGIN_LINK_TTL_MS = 15 * 60 * 1000;

const list = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export function loadConfig(env: NodeJS.ProcessEnv = process.env): CloudConfig {
  const apiKey = env.FIREBASE_API_KEY?.trim() ?? '';
  const authDomain = env.FIREBASE_AUTH_DOMAIN?.trim() ?? '';
  const projectId = env.FIREBASE_PROJECT_ID?.trim() ?? '';
  const appId = env.FIREBASE_APP_ID?.trim() ?? '';
  const firebase =
    apiKey && authDomain && projectId && appId ? { apiKey, authDomain, projectId, appId } : null;

  return {
    host: env.CLOUD_HOST || '127.0.0.1',
    port: Number(env.CLOUD_PORT || 3200),
    dbPath: env.CLOUD_DB_PATH || '/var/lib/termhive-cloud/cloud.db',
    clientDist: env.CLOUD_CLIENT_DIST || '/opt/termhive-v2/dist/client',
    allowedOrigins: list(env.CLOUD_ORIGINS || 'https://sg1-termhive2.tailfa2e0b.ts.net'),
    cookieSecure: env.CLOUD_COOKIE_SECURE !== '0',
    signupMode: env.SIGNUP_MODE === 'invite' ? 'invite' : 'open',
    adminEmails: list(env.ADMIN_EMAILS).map((email) => email.toLowerCase()),
    firebase,
    wsEnvDir: env.CLOUD_WS_ENV_DIR || '/etc/termhive/ws',
    wsLimitsDir: env.CLOUD_WS_LIMITS_DIR || '/etc/termhive-limits',
    repoDir: env.CLOUD_REPO_DIR || '/opt/termhive-v2',
    devSessions: env.TERMHIVE_DEV_SESSIONS === '1',
  };
}
