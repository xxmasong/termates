/**
 * termhive-admin — operate TermHive Cloud from a root shell on the host.
 *
 *   termhive-admin users
 *   termhive-admin set-plan <email> <free|pro|pro-plus>
 *   termhive-admin invite create [--uses N] [--days D]
 *   termhive-admin invite list
 *   termhive-admin suspend <email>
 *   termhive-admin activate <email>
 *   termhive-admin sync-firewall
 *   termhive-admin dev-session <email> [--plan P]   (needs TERMHIVE_DEV_SESSIONS=1)
 *
 * Reads the same /etc/termhive/cloud.env as the service.
 */

import dotenv from 'dotenv';

import { generateInviteCode, hashInvite } from './accounts.js';
import { isPlanId, loadConfig, type PlanId } from './config.js';
import { CloudDb, type UserRow } from './db.js';
import { newUnixUser, nextPortBase, Provisioner } from './provisioner.js';
import { createSession } from './sessions.js';

const ENV_FILE = process.env.CLOUD_ENV_FILE || '/etc/termhive/cloud.env';
const DEV_UID_PREFIX = 'dev:';
const DAY_MS = 24 * 60 * 60 * 1000;

class UsageError extends Error {}

const USAGE = `usage:
  termhive-admin users
  termhive-admin set-plan <email> <free|pro|pro-plus>
  termhive-admin invite create [--uses N] [--days D]
  termhive-admin invite list
  termhive-admin suspend <email>
  termhive-admin activate <email>
  termhive-admin sync-firewall
  termhive-admin dev-session <email> [--plan P]   (TERMHIVE_DEV_SESSIONS=1 only)`;

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function positiveInt(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new UsageError(`${name} must be a positive integer`);
  return parsed;
}

function oneUser(db: CloudDb, email: string | undefined): UserRow {
  if (!email) throw new UsageError('email required');
  const users = db.usersByEmail(email);
  if (users.length === 0) throw new UsageError(`no user with email ${email}`);
  if (users.length > 1) {
    throw new UsageError(
      `${users.length} users share ${email} (ids ${users.map((u) => u.id).join(', ')})`,
    );
  }
  return users[0];
}

async function main(argv: string[]): Promise<void> {
  dotenv.config({ path: ENV_FILE, quiet: true });
  const config = loadConfig();
  const db = new CloudDb(config.dbPath);
  const provisioner = new Provisioner(db, config, undefined, (message) => console.error(message));
  const [command, ...args] = argv;

  try {
    switch (command) {
      case 'users': {
        const rows = db.listUsers().map((u) => ({
          id: u.id,
          email: u.email,
          plan: u.plan,
          role: u.role,
          status: u.status,
          unix: u.unix_user ?? '-',
          ports: u.port_base ?? '-',
          workspace: u.state ?? '-',
          lastActive: u.last_active_at ?? '-',
        }));
        console.table(rows);
        return;
      }

      case 'set-plan': {
        const user = oneUser(db, args[0]);
        const plan = args[1];
        if (!isPlanId(plan)) throw new UsageError('plan must be free, pro or pro-plus');
        db.setUserPlan(user.id, plan as PlanId);
        db.audit(user.id, 'admin.set_plan', { from: user.plan, to: plan });
        await provisioner.applyPlan({ ...user, plan: plan as PlanId });
        console.log(`${user.email}: ${user.plan} → ${plan} (workspace restarted)`);
        return;
      }

      case 'invite': {
        if (args[0] === 'list') {
          console.table(
            db.listInvites().map((i) => ({
              hash: i.code_hash.slice(0, 12),
              uses: `${i.uses}/${i.max_uses}`,
              expires: i.expires_at ?? 'never',
              created: i.created_at,
            })),
          );
          return;
        }
        if (args[0] !== 'create') throw new UsageError('invite create|list');
        const uses = positiveInt(option(args, '--uses'), 1, '--uses');
        const days = option(args, '--days');
        const expiresAt = days
          ? new Date(Date.now() + positiveInt(days, 0, '--days') * DAY_MS).toISOString()
          : null;
        const code = generateInviteCode();
        db.insertInvite(hashInvite(code), uses, expiresAt);
        db.audit(null, 'admin.invite_created', { uses, expiresAt });
        console.log(code);
        return;
      }

      case 'suspend': {
        const user = oneUser(db, args[0]);
        db.setUserStatus(user.id, 'suspended');
        db.deleteUserSessions(user.id);
        const ws = db.workspaceByUser(user.id);
        if (ws) await provisioner.stop(ws);
        db.audit(user.id, 'admin.suspend', {});
        console.log(`${user.email} suspended, sessions revoked, workspace stopped`);
        return;
      }

      case 'activate': {
        const user = oneUser(db, args[0]);
        db.setUserStatus(user.id, 'active');
        db.audit(user.id, 'admin.activate', {});
        console.log(`${user.email} active (workspace starts on next visit)`);
        return;
      }

      case 'sync-firewall': {
        await provisioner.syncFirewall();
        console.log('per-user nft rules rebuilt');
        return;
      }

      case 'dev-session': {
        if (!config.devSessions) {
          throw new UsageError(
            'dev sessions are disabled (set TERMHIVE_DEV_SESSIONS=1 in cloud.env)',
          );
        }
        const email = args[0];
        if (!email) throw new UsageError('email required');
        const planArg = option(args, '--plan') ?? 'free';
        if (!isPlanId(planArg)) throw new UsageError('plan must be free, pro or pro-plus');
        const uid = `${DEV_UID_PREFIX}${email.toLowerCase()}`;
        let user = db.userByFirebaseUid(uid);
        if (!user) {
          user = db.insertUser({
            firebaseUid: uid,
            email,
            name: 'Dev user',
            avatarUrl: null,
            plan: planArg,
            role: 'user',
          });
          db.audit(user.id, 'user.created', { email, plan: planArg, provider: 'dev' });
        }
        if (!db.workspaceByUser(user.id)) {
          const portBase = nextPortBase(db);
          if (portBase === null) throw new UsageError('no free port block');
          db.insertWorkspace({
            userId: user.id,
            unixUser: newUnixUser(),
            portBase,
            state: 'provisioning',
          });
        }
        await provisioner.provision(user);
        const ws = db.workspaceByUser(user.id);
        const { token } = createSession(db, user.id, {
          ip: 'termhive-admin',
          userAgent: 'dev-session',
        });
        db.audit(user.id, 'session.created', { provider: 'dev' });
        console.error(`workspace ${ws?.unix_user} on ${ws?.port_base}: ${ws?.state}`);
        console.log(`th_session=${token}`);
        return;
      }

      default:
        throw new UsageError(command ? `unknown command: ${command}` : 'command required');
    }
  } finally {
    db.close();
  }
}

main(process.argv.slice(2)).catch((err) => {
  if (err instanceof UsageError) {
    console.error(`termhive-admin: ${err.message}\n\n${USAGE}`);
    process.exit(2);
  }
  console.error(err);
  process.exit(1);
});
