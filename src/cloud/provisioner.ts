/**
 * provisioner.ts — one Linux user + one systemd workspace per account.
 *
 * Runs as root. Every step is idempotent so a failed provision can simply be
 * retried: the Unix user, env file, unit and firewall rules are (re)applied
 * and the workspace is waited on until its daemon reports connected.
 */

import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  PLANS,
  PORT_BASE_MAX,
  PORT_BASE_MIN,
  PORT_STEP,
  ROOT_WORKSPACE,
  UID_MAX,
  UID_MIN,
  type CloudConfig,
  type PlanId,
} from './config.js';
import type { CloudDb, UserRow, WorkspaceRow } from './db.js';

export interface RunResult {
  stdout: string;
}

/** Runs a command without a shell; rejects on a non-zero exit. */
export type Runner = (command: string, args: string[]) => Promise<RunResult>;

export const execRunner: Runner = (command, args) =>
  new Promise((resolve, reject) => {
    execFile(command, args, { timeout: 60_000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(`${command} ${args.join(' ')}: ${stderr.trim() || err.message}`));
      else resolve({ stdout });
    });
  });

const READY_TIMEOUT_MS = 90_000;
const READY_POLL_MS = 1_000;
const NFT_TABLE = 'inet termhive';
const NFT_ALLOW_CHAIN = 'ws_allow';

export const unitFor = (ws: Pick<WorkspaceRow, 'unix_user'>): string =>
  ws.unix_user === ROOT_WORKSPACE.unixUser
    ? ROOT_WORKSPACE.unit
    : `termhive-ws@${ws.unix_user}.service`;

export const isRootWorkspace = (ws: Pick<WorkspaceRow, 'unix_user'>): boolean =>
  ws.unix_user === ROOT_WORKSPACE.unixUser;

export const newUnixUser = (): string => `th-${crypto.randomBytes(4).toString('hex')}`;

/** The next free port block (web, daemon, claude bridge), or null when full. */
export function nextPortBase(db: CloudDb): number | null {
  const used = new Set(db.listWorkspaces().map((ws) => ws.port_base));
  for (let base = PORT_BASE_MIN; base <= PORT_BASE_MAX; base += PORT_STEP) {
    if (!used.has(base)) return base;
  }
  return null;
}

export const limitsFileFor = (dir: string, ws: Pick<WorkspaceRow, 'unix_user'>): string =>
  path.join(dir, `${ws.unix_user}.json`);

export function workspaceEnv(
  ws: Pick<WorkspaceRow, 'unix_user' | 'port_base'>,
  plan: PlanId,
  limitsFile?: string,
): string {
  const limits = PLANS[plan];
  const home = `/home/${ws.unix_user}`;
  const lines = [
    '# Managed by termhive-cloud — rewritten on plan changes.',
    `HOME=${home}`,
    `USER=${ws.unix_user}`,
    'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    'NODE_ENV=production',
    `PORT=${ws.port_base}`,
    `TERMHIVE_DAEMON_PORT=${ws.port_base + 1}`,
    `CLAUDE_BRIDGE_PORT=${ws.port_base + 2}`,
    `TERMHIVE_MAX_PROJECTS=${limits.maxProjects ?? ''}`,
    `TERMHIVE_MAX_AGENTS=${limits.maxAgents}`,
    ...(limitsFile ? [`TERMHIVE_LIMITS_FILE=${limitsFile}`] : []),
    'TERMHIVE_CONFINE_HOME=1',
    'GEMINI_CLI_TRUST_WORKSPACE=true',
    'NO_BROWSER=1',
  ];
  return `${lines.join('\n')}\n`;
}

export class Provisioner {
  private readonly inflight = new Map<number, Promise<void>>();

  constructor(
    private readonly db: CloudDb,
    private readonly config: CloudConfig,
    private readonly run: Runner = execRunner,
    private readonly log: (message: string) => void = (message) =>
      console.log(`[provisioner] ${message}`),
  ) {}

  /** Provision (or finish provisioning) a user's workspace. Never throws. */
  provision(user: UserRow): Promise<void> {
    const existing = this.inflight.get(user.id);
    if (existing) return existing;
    const job = this.doProvision(user).finally(() => this.inflight.delete(user.id));
    this.inflight.set(user.id, job);
    return job;
  }

  private async doProvision(user: UserRow): Promise<void> {
    const ws = this.db.workspaceByUser(user.id);
    if (!ws) return;
    if (isRootWorkspace(ws)) {
      this.db.setWorkspaceState(user.id, 'running');
      return;
    }
    try {
      this.db.setWorkspaceState(user.id, 'provisioning');
      await this.ensureUnixUser(ws.unix_user);
      this.writeEnv(ws, user.plan);
      await this.syncFirewall();
      await this.run('systemctl', ['enable', '--now', unitFor(ws)]);
      await this.waitReady(ws);
      this.db.setWorkspaceState(user.id, 'running');
      this.db.audit(user.id, 'workspace.provisioned', {
        unixUser: ws.unix_user,
        portBase: ws.port_base,
      });
      this.log(`${ws.unix_user} ready on ${ws.port_base}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.db.setWorkspaceState(user.id, 'error');
      this.db.audit(user.id, 'workspace.error', { unixUser: ws.unix_user, error: message });
      this.log(`${ws.unix_user} failed: ${message}`);
    }
  }

  /** Start a stopped workspace and wait for it. Never throws. */
  async start(user: UserRow): Promise<void> {
    const ws = this.db.workspaceByUser(user.id);
    if (!ws) return;
    const existing = this.inflight.get(user.id);
    if (existing) return existing;
    const job = (async () => {
      try {
        await this.run('systemctl', ['start', unitFor(ws)]);
        await this.waitReady(ws);
        this.db.setWorkspaceState(user.id, 'running');
      } catch (err) {
        this.db.setWorkspaceState(user.id, 'error');
        this.db.audit(user.id, 'workspace.error', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })().finally(() => this.inflight.delete(user.id));
    this.inflight.set(user.id, job);
    return job;
  }

  async stop(ws: WorkspaceRow): Promise<void> {
    if (isRootWorkspace(ws)) return;
    await this.run('systemctl', ['stop', unitFor(ws)]);
    this.db.setWorkspaceState(ws.user_id, 'stopped');
  }

  /** Rewrite a workspace's env for a new plan and restart it. */
  /**
   * Apply a plan change. Workspaces started with TERMHIVE_LIMITS_FILE pick the
   * new limits up live, so running agents keep running; older ones get the
   * file added to their env and one restart. Returns whether it restarted.
   */
  async applyPlan(user: UserRow): Promise<boolean> {
    const ws = this.db.workspaceByUser(user.id);
    if (!ws || isRootWorkspace(ws)) return false;
    let hadLimitsFile = false;
    try {
      hadLimitsFile = fs.readFileSync(this.envFile(ws), 'utf-8').includes('TERMHIVE_LIMITS_FILE=');
    } catch {
      hadLimitsFile = false;
    }
    this.writeEnv(ws, user.plan);
    if (hadLimitsFile || ws.state !== 'running') return false;
    await this.run('systemctl', ['restart', unitFor(ws)]);
    await this.waitReady(ws);
    this.db.setWorkspaceState(user.id, 'running');
    return true;
  }

  private async ensureUnixUser(name: string): Promise<void> {
    try {
      await this.run('id', ['-u', name]);
    } catch {
      await this.run('useradd', [
        '-m',
        '-d',
        `/home/${name}`,
        '-s',
        '/bin/bash',
        '-U',
        '-K',
        `UID_MIN=${UID_MIN}`,
        '-K',
        `UID_MAX=${UID_MAX}`,
        '-K',
        `GID_MIN=${UID_MIN}`,
        '-K',
        `GID_MAX=${UID_MAX}`,
        name,
      ]);
    }
    fs.chmodSync(`/home/${name}`, 0o700);
  }

  private envFile(ws: WorkspaceRow): string {
    return path.join(this.config.wsEnvDir, `${ws.unix_user}.env`);
  }

  private writeEnv(ws: WorkspaceRow, plan: PlanId): void {
    fs.mkdirSync(this.config.wsEnvDir, { recursive: true, mode: 0o700 });
    const limitsFile = this.writeLimits(ws, plan);
    const file = this.envFile(ws);
    fs.writeFileSync(file, workspaceEnv(ws, plan, limitsFile), { mode: 0o600 });
    fs.chmodSync(file, 0o600);
  }

  /** Root-owned 0644 JSON the workspace re-reads on every create. */
  private writeLimits(ws: WorkspaceRow, plan: PlanId): string {
    fs.mkdirSync(this.config.wsLimitsDir, { recursive: true, mode: 0o755 });
    const file = limitsFileFor(this.config.wsLimitsDir, ws);
    const { maxProjects, maxAgents } = PLANS[plan];
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify({ maxProjects, maxAgents })}\n`, { mode: 0o644 });
    fs.chmodSync(tmp, 0o644);
    fs.renameSync(tmp, file);
    return file;
  }

  /**
   * Rebuild the per-user loopback allow rules: each workspace user may reach
   * its own three ports and nothing else in 3210/3300/4000-4999 (the base
   * ruleset in /etc/nftables.d/termhive.nft drops the rest).
   */
  async syncFirewall(): Promise<void> {
    const rules = [`flush chain ${NFT_TABLE} ${NFT_ALLOW_CHAIN}`];
    for (const ws of this.db.listWorkspaces()) {
      if (isRootWorkspace(ws)) continue;
      let uid: string;
      try {
        uid = (await this.run('id', ['-u', ws.unix_user])).stdout.trim();
      } catch {
        continue; // not created yet
      }
      rules.push(
        `add rule ${NFT_TABLE} ${NFT_ALLOW_CHAIN} meta skuid ${uid} tcp dport ${ws.port_base}-${ws.port_base + 2} accept comment "${ws.unix_user}"`,
      );
    }
    // nft -f refuses pipes ("Not a regular file"), so go through a temp file.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'termhive-nft-'));
    const file = path.join(dir, 'ws_allow.nft');
    try {
      fs.writeFileSync(file, `${rules.join('\n')}\n`, { mode: 0o600 });
      await this.run('nft', ['-f', file]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  private async waitReady(ws: WorkspaceRow): Promise<void> {
    const deadline = Date.now() + READY_TIMEOUT_MS;
    let last = 'no response';
    while (Date.now() < deadline) {
      try {
        const response = await fetch(`http://127.0.0.1:${ws.port_base}/api/daemon/status`, {
          signal: AbortSignal.timeout(READY_POLL_MS * 2),
        });
        if (response.ok && ((await response.json()) as { connected?: boolean }).connected) return;
        last = `HTTP ${response.status}`;
      } catch (err) {
        last = err instanceof Error ? err.message : String(err);
      }
      await new Promise((resolve) => setTimeout(resolve, READY_POLL_MS));
    }
    throw new Error(
      `workspace on ${ws.port_base} not ready after ${READY_TIMEOUT_MS / 1000}s (${last})`,
    );
  }
}
