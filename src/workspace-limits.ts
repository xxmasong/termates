/**
 * workspace-limits.ts — plan limits and cwd confinement for one workspace.
 *
 * The control plane starts each workspace with its plan's limits in the
 * environment, plus TERMHIVE_LIMITS_FILE: a root-owned JSON file outside HOME
 * (agents can read it, never write it) that is re-read on every create, so a
 * plan change applies without restarting the workspace. Both the
 * REST routes and the Keeper's MCP tools end in storage.create*, so storage
 * calls these guards and every create path is covered.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

export const MAX_PROJECTS_ENV = 'TERMHIVE_MAX_PROJECTS';
export const MAX_AGENTS_ENV = 'TERMHIVE_MAX_AGENTS';
export const CONFINE_HOME_ENV = 'TERMHIVE_CONFINE_HOME';
export const LIMITS_FILE_ENV = 'TERMHIVE_LIMITS_FILE';

/** Contents of TERMHIVE_LIMITS_FILE. `null` means unlimited. */
export interface LimitsFile {
  maxProjects: number | null;
  maxAgents: number | null;
}

export type LimitKind = 'project' | 'agent';

const NOUNS: Record<LimitKind, [singular: string, plural: string]> = {
  project: ['project', 'projects'],
  agent: ['agent', 'agents'],
};

export class PlanLimitError extends Error {
  readonly code = 'PLAN_LIMIT';

  constructor(
    readonly kind: LimitKind,
    readonly limit: number,
    readonly used: number,
  ) {
    const noun = NOUNS[kind][limit === 1 ? 0 : 1];
    super(`Your plan includes ${limit} ${noun}. Upgrade to add more.`);
    this.name = 'PlanLimitError';
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      kind: this.kind,
      limit: this.limit,
      used: this.used,
    };
  }
}

export class CwdOutsideHomeError extends Error {
  readonly code = 'CWD_OUTSIDE_HOME';

  constructor(
    readonly cwd: string,
    readonly home: string,
  ) {
    super(`The working directory must be inside ${home}.`);
    this.name = 'CwdOutsideHomeError';
  }

  toJSON() {
    return { error: this.message, code: this.code };
  }
}

function readLimitsFile(env: NodeJS.ProcessEnv): Partial<LimitsFile> | null {
  const file = env[LIMITS_FILE_ENV];
  if (!file) return null;
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return parsed && typeof parsed === 'object' ? (parsed as Partial<LimitsFile>) : null;
  } catch {
    return null;
  }
}

/**
 * The current limit: TERMHIVE_LIMITS_FILE when readable, else the environment.
 * Unset or blank means unlimited.
 */
export function readLimit(kind: LimitKind, env: NodeJS.ProcessEnv = process.env): number | null {
  const file = readLimitsFile(env);
  if (file) {
    const value = kind === 'project' ? file.maxProjects : file.maxAgents;
    if (value === null) return null;
    // A malformed value fails closed, like the environment.
    return Number.isInteger(value) && (value as number) >= 0 ? (value as number) : 0;
  }
  const raw = env[kind === 'project' ? MAX_PROJECTS_ENV : MAX_AGENTS_ENV];
  if (raw === undefined || raw.trim() === '') return null;
  const value = Number(raw);
  // A malformed value fails closed: nothing can be created until it is fixed.
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

/** Throw PlanLimitError when creating one more `kind` would exceed the plan. */
export function assertCanCreate(
  kind: LimitKind,
  used: number,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const limit = readLimit(kind, env);
  if (limit !== null && used >= limit) throw new PlanLimitError(kind, limit, used);
}

function homeDir(env: NodeJS.ProcessEnv): string {
  return env.HOME || os.homedir();
}

function expandHome(p: string, home: string): string {
  if (p === '~') return home;
  if (p.startsWith('~/')) return path.join(home, p.slice(2));
  return p;
}

/** Resolve symlinks on the longest existing prefix of `p`. */
function realpathExisting(p: string): string {
  let current = p;
  const rest: string[] = [];
  for (;;) {
    try {
      return path.join(fs.realpathSync(current), ...rest);
    } catch {
      const parent = path.dirname(current);
      if (parent === current) return p;
      rest.unshift(path.basename(current));
      current = parent;
    }
  }
}

/**
 * With TERMHIVE_CONFINE_HOME=1, a project/agent cwd must resolve inside HOME
 * (symlinks followed), else CwdOutsideHomeError. Returns the input unchanged so
 * stored values keep their original spelling (e.g. `~/code`).
 */
export function assertCwdAllowed(cwd: string, env: NodeJS.ProcessEnv = process.env): string {
  if (env[CONFINE_HOME_ENV] !== '1') return cwd;
  const home = realpathExisting(path.resolve(homeDir(env)));
  const target = realpathExisting(path.resolve(expandHome(cwd.trim(), homeDir(env))));
  if (target !== home && !target.startsWith(home + path.sep)) {
    throw new CwdOutsideHomeError(cwd, home);
  }
  return cwd;
}
