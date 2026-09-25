/**
 * accounts.ts — turn verified Firebase claims into a TermHive account.
 *
 * First sign-in creates the user (subject to SIGNUP_MODE / invites) and its
 * workspace row; provisioning then runs in the background while the client
 * shows "Preparing your workspace…".
 */

import crypto from 'node:crypto';

import { PLANS, ROOT_WORKSPACE, isPlanId, type CloudConfig, type PlanId } from './config.js';
import type { CloudDb, UserRow, WorkspaceRow } from './db.js';
import type { FirebaseClaims } from './firebase-token.js';
import { newUnixUser, nextPortBase } from './provisioner.js';

export type AccountErrorCode =
  | 'EMAIL_UNVERIFIED'
  | 'SIGNUPS_CLOSED'
  | 'INVALID_INVITE'
  | 'ACCOUNT_SUSPENDED'
  | 'NO_EMAIL'
  | 'CAPACITY';

export class AccountError extends Error {
  constructor(
    readonly status: number,
    readonly code: AccountErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AccountError';
  }
}

export const normalizeInvite = (code: string): string => code.trim().toUpperCase();
export const hashInvite = (code: string): string =>
  crypto.createHash('sha256').update(normalizeInvite(code)).digest('hex');

/** A readable invite code, e.g. `HIVE-7K2M-Q9XD`. */
export function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(8);
  const chars = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  return `HIVE-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

export interface SignInInput {
  plan?: unknown;
  inviteCode?: unknown;
}

export interface SignInResult {
  user: UserRow;
  workspace: WorkspaceRow;
  created: boolean;
  /** true when the caller should start provisioning */
  needsProvision: boolean;
}

export class Accounts {
  constructor(
    private readonly db: CloudDb,
    private readonly config: CloudConfig,
  ) {}

  private isAdmin(claims: FirebaseClaims): boolean {
    return Boolean(
      claims.email &&
        claims.email_verified === true &&
        this.config.adminEmails.includes(claims.email.toLowerCase()),
    );
  }

  signIn(claims: FirebaseClaims, input: SignInInput): SignInResult {
    const provider = claims.firebase?.sign_in_provider;
    if (provider === 'password' && claims.email_verified !== true) {
      throw new AccountError(403, 'EMAIL_UNVERIFIED', 'Please verify your email first.');
    }
    if (!claims.email) {
      throw new AccountError(403, 'NO_EMAIL', 'Your account has no email address.');
    }
    const admin = this.isAdmin(claims);
    const profile = {
      email: claims.email,
      name: claims.name ?? null,
      avatarUrl: claims.picture ?? null,
    };

    return this.db.tx(() => {
      let user = this.db.userByFirebaseUid(claims.sub);
      let created = false;

      if (user) {
        if (user.status !== 'active') {
          throw new AccountError(403, 'ACCOUNT_SUSPENDED', 'This account is suspended.');
        }
        this.db.updateUserProfile(user.id, profile);
        if (admin && user.role !== 'admin') {
          this.db.raw.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id);
        }
      } else {
        if (!admin) this.checkSignupAllowed(input.inviteCode);
        const plan: PlanId = admin ? 'pro-plus' : isPlanId(input.plan) ? input.plan : 'free';
        user = this.db.insertUser({
          firebaseUid: claims.sub,
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
          plan,
          role: admin ? 'admin' : 'user',
        });
        created = true;
        this.db.audit(user.id, 'user.created', { email: user.email, plan, provider });
      }

      let workspace = this.db.workspaceByUser(user.id);
      if (!workspace) {
        workspace = this.createWorkspace(user.id, admin);
      }
      const current = this.db.userById(user.id) as UserRow;
      const needsProvision = workspace.state === 'provisioning' || workspace.state === 'error';
      return { user: current, workspace, created, needsProvision };
    });
  }

  /** Invite mode needs a valid, unused invite; open mode uses one if given. */
  private checkSignupAllowed(inviteCode: unknown): void {
    const code = typeof inviteCode === 'string' ? inviteCode.trim() : '';
    const consumed = code ? this.db.consumeInvite(hashInvite(code)) : false;
    if (this.config.signupMode !== 'invite' || consumed) return;
    if (!code) throw new AccountError(403, 'SIGNUPS_CLOSED', 'Sign-ups are invite-only right now.');
    throw new AccountError(403, 'INVALID_INVITE', 'That invite code is invalid or used up.');
  }

  private createWorkspace(userId: number, admin: boolean): WorkspaceRow {
    // The first admin inherits the existing root workspace and its data.
    if (admin && !this.db.workspaceByUnixUser(ROOT_WORKSPACE.unixUser)) {
      this.db.audit(userId, 'workspace.linked_root', {});
      return this.db.insertWorkspace({
        userId,
        unixUser: ROOT_WORKSPACE.unixUser,
        portBase: ROOT_WORKSPACE.portBase,
        state: 'running',
      });
    }
    const portBase = nextPortBase(this.db);
    if (portBase === null) {
      throw new AccountError(503, 'CAPACITY', 'No workspace capacity left. Try again later.');
    }
    let unixUser = newUnixUser();
    while (this.db.workspaceByUnixUser(unixUser)) unixUser = newUnixUser();
    return this.db.insertWorkspace({ userId, unixUser, portBase, state: 'provisioning' });
  }

  /** The /auth/me payload. */
  me(user: UserRow) {
    const plan = PLANS[user.plan] ?? PLANS.free;
    const workspace = this.db.workspaceByUser(user.id);
    return {
      user: { email: user.email, name: user.name, avatarUrl: user.avatar_url, role: user.role },
      plan: { id: plan.id, maxProjects: plan.maxProjects, maxAgents: plan.maxAgents },
      workspace: { state: workspace?.state ?? 'provisioning' },
    };
  }
}
