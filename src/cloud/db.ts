/**
 * db.ts — the control plane's SQLite store (node:sqlite, no dependency).
 *
 * Migrations are append-only and tracked with PRAGMA user_version. The CLI
 * and the server open the same file, so it runs in WAL mode with a busy
 * timeout.
 */

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import type { PlanId } from './config.js';

const MIGRATIONS: readonly string[] = [
  `CREATE TABLE users (
     id INTEGER PRIMARY KEY,
     firebase_uid TEXT NOT NULL UNIQUE,
     email TEXT NOT NULL,
     name TEXT,
     avatar_url TEXT,
     plan TEXT NOT NULL DEFAULT 'free',
     role TEXT NOT NULL DEFAULT 'user',
     status TEXT NOT NULL DEFAULT 'active',
     created_at TEXT NOT NULL
   );
   CREATE INDEX users_email ON users(email);
   CREATE TABLE workspaces (
     user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
     unix_user TEXT NOT NULL UNIQUE,
     port_base INTEGER NOT NULL UNIQUE,
     state TEXT NOT NULL,
     created_at TEXT NOT NULL,
     last_active_at TEXT
   );
   CREATE TABLE sessions (
     id_hash TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at TEXT NOT NULL,
     expires_at TEXT NOT NULL,
     ip TEXT,
     user_agent TEXT
   );
   CREATE INDEX sessions_user ON sessions(user_id);
   CREATE TABLE invites (
     code_hash TEXT PRIMARY KEY,
     max_uses INTEGER NOT NULL,
     uses INTEGER NOT NULL DEFAULT 0,
     expires_at TEXT,
     created_at TEXT NOT NULL
   );
   CREATE TABLE audit_log (
     id INTEGER PRIMARY KEY,
     user_id INTEGER,
     action TEXT NOT NULL,
     detail TEXT,
     at TEXT NOT NULL
   );`,
];

export type Role = 'user' | 'admin';
export type UserStatus = 'active' | 'suspended';
export type WorkspaceState = 'provisioning' | 'running' | 'stopped' | 'error';

export interface UserRow {
  id: number;
  firebase_uid: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  plan: PlanId;
  role: Role;
  status: UserStatus;
  created_at: string;
}

export interface WorkspaceRow {
  user_id: number;
  unix_user: string;
  port_base: number;
  state: WorkspaceState;
  created_at: string;
  last_active_at: string | null;
}

export interface SessionRow {
  id_hash: string;
  user_id: number;
  created_at: string;
  expires_at: string;
  ip: string | null;
  user_agent: string | null;
}

export interface InviteRow {
  code_hash: string;
  max_uses: number;
  uses: number;
  expires_at: string | null;
  created_at: string;
}

const now = (): string => new Date().toISOString();

export class CloudDb {
  readonly raw: DatabaseSync;

  constructor(file: string) {
    if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    this.raw = new DatabaseSync(file);
    this.raw.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;');
    this.migrate();
  }

  private migrate(): void {
    const { user_version: version } = this.raw.prepare('PRAGMA user_version').get() as {
      user_version: number;
    };
    for (let i = version; i < MIGRATIONS.length; i += 1) {
      this.raw.exec('BEGIN');
      try {
        this.raw.exec(MIGRATIONS[i]);
        this.raw.exec(`PRAGMA user_version = ${i + 1}`);
        this.raw.exec('COMMIT');
      } catch (err) {
        this.raw.exec('ROLLBACK');
        throw err;
      }
    }
  }

  close(): void {
    this.raw.close();
  }

  /** Run `fn` in one transaction. */
  tx<T>(fn: () => T): T {
    this.raw.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      this.raw.exec('COMMIT');
      return result;
    } catch (err) {
      this.raw.exec('ROLLBACK');
      throw err;
    }
  }

  // ── users ──────────────────────────────────────────────────────────────

  userByFirebaseUid(uid: string): UserRow | undefined {
    return this.raw.prepare('SELECT * FROM users WHERE firebase_uid = ?').get(uid) as
      | UserRow
      | undefined;
  }

  userById(id: number): UserRow | undefined {
    return this.raw.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  }

  usersByEmail(email: string): UserRow[] {
    return this.raw
      .prepare('SELECT * FROM users WHERE lower(email) = lower(?) ORDER BY id')
      .all(email) as unknown as UserRow[];
  }

  listUsers(): Array<UserRow & Partial<WorkspaceRow>> {
    return this.raw
      .prepare(
        `SELECT u.*, w.unix_user, w.port_base, w.state, w.last_active_at
           FROM users u LEFT JOIN workspaces w ON w.user_id = u.id ORDER BY u.id`,
      )
      .all() as unknown as Array<UserRow & Partial<WorkspaceRow>>;
  }

  insertUser(input: {
    firebaseUid: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    plan: PlanId;
    role: Role;
  }): UserRow {
    const result = this.raw
      .prepare(
        `INSERT INTO users (firebase_uid, email, name, avatar_url, plan, role, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
      )
      .run(input.firebaseUid, input.email, input.name, input.avatarUrl, input.plan, input.role, now());
    return this.userById(Number(result.lastInsertRowid)) as UserRow;
  }

  updateUserProfile(id: number, profile: { email: string; name: string | null; avatarUrl: string | null }): void {
    this.raw
      .prepare('UPDATE users SET email = ?, name = COALESCE(?, name), avatar_url = COALESCE(?, avatar_url) WHERE id = ?')
      .run(profile.email, profile.name, profile.avatarUrl, id);
  }

  setUserPlan(id: number, plan: PlanId): void {
    this.raw.prepare('UPDATE users SET plan = ? WHERE id = ?').run(plan, id);
  }

  setUserStatus(id: number, status: UserStatus): void {
    this.raw.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id);
  }

  // ── workspaces ─────────────────────────────────────────────────────────

  workspaceByUser(userId: number): WorkspaceRow | undefined {
    return this.raw.prepare('SELECT * FROM workspaces WHERE user_id = ?').get(userId) as
      | WorkspaceRow
      | undefined;
  }

  workspaceByUnixUser(unixUser: string): WorkspaceRow | undefined {
    return this.raw.prepare('SELECT * FROM workspaces WHERE unix_user = ?').get(unixUser) as
      | WorkspaceRow
      | undefined;
  }

  listWorkspaces(): WorkspaceRow[] {
    return this.raw.prepare('SELECT * FROM workspaces ORDER BY port_base').all() as unknown as WorkspaceRow[];
  }

  maxPortBase(): number | null {
    const row = this.raw.prepare('SELECT MAX(port_base) AS max FROM workspaces').get() as {
      max: number | null;
    };
    return row.max;
  }

  insertWorkspace(input: { userId: number; unixUser: string; portBase: number; state: WorkspaceState }): WorkspaceRow {
    this.raw
      .prepare(
        `INSERT INTO workspaces (user_id, unix_user, port_base, state, created_at, last_active_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(input.userId, input.unixUser, input.portBase, input.state, now(), now());
    return this.workspaceByUser(input.userId) as WorkspaceRow;
  }

  setWorkspaceState(userId: number, state: WorkspaceState): void {
    this.raw.prepare('UPDATE workspaces SET state = ? WHERE user_id = ?').run(state, userId);
  }

  touchWorkspace(userId: number): void {
    this.raw.prepare('UPDATE workspaces SET last_active_at = ? WHERE user_id = ?').run(now(), userId);
  }

  // ── sessions ───────────────────────────────────────────────────────────

  insertSession(row: SessionRow): void {
    this.raw
      .prepare(
        `INSERT INTO sessions (id_hash, user_id, created_at, expires_at, ip, user_agent)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(row.id_hash, row.user_id, row.created_at, row.expires_at, row.ip, row.user_agent);
  }

  sessionByHash(idHash: string): SessionRow | undefined {
    return this.raw.prepare('SELECT * FROM sessions WHERE id_hash = ?').get(idHash) as
      | SessionRow
      | undefined;
  }

  deleteSession(idHash: string): void {
    this.raw.prepare('DELETE FROM sessions WHERE id_hash = ?').run(idHash);
  }

  deleteUserSessions(userId: number): void {
    this.raw.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  }

  deleteExpiredSessions(): void {
    this.raw.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now());
  }

  // ── invites ────────────────────────────────────────────────────────────

  insertInvite(codeHash: string, maxUses: number, expiresAt: string | null): void {
    this.raw
      .prepare('INSERT INTO invites (code_hash, max_uses, uses, expires_at, created_at) VALUES (?, ?, 0, ?, ?)')
      .run(codeHash, maxUses, expiresAt, now());
  }

  /** Atomically use one invite slot. False when unknown, used up or expired. */
  consumeInvite(codeHash: string): boolean {
    const result = this.raw
      .prepare(
        `UPDATE invites SET uses = uses + 1
          WHERE code_hash = ? AND uses < max_uses AND (expires_at IS NULL OR expires_at > ?)`,
      )
      .run(codeHash, now());
    return Number(result.changes) === 1;
  }

  listInvites(): InviteRow[] {
    return this.raw.prepare('SELECT * FROM invites ORDER BY created_at').all() as unknown as InviteRow[];
  }

  // ── audit ──────────────────────────────────────────────────────────────

  audit(userId: number | null, action: string, detail: Record<string, unknown> = {}): void {
    this.raw
      .prepare('INSERT INTO audit_log (user_id, action, detail, at) VALUES (?, ?, ?, ?)')
      .run(userId, action, JSON.stringify(detail), now());
  }
}
