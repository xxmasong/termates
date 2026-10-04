/**
 * storage-paths.ts — validation for everything storage turns into a path.
 *
 * Project names become directory names (shared content, wiki) and file names
 * come from clients, agents and the Keeper, so both are checked before any
 * filesystem call: no traversal, no absolute paths, no NUL bytes, no names
 * that collapse onto a parent directory.
 */

import path from 'path';

import { InvalidInputError } from './storage-errors.js';

const PROJECT_NAME_MAX = 80;
const FILENAME_MAX = 255;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const AGENT_NAME_MAX = 64;
const AGENT_ROLE_MAX = 2000;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1f\x7f]/;
/** Launch settings (model, effort, …) become CLI arguments: plain ids only. */
const LAUNCH_SETTING = /^[A-Za-z0-9][\w.:[\]/-]{0,99}$/;

/** Project and agent ids are UUIDs; anything else is never a valid id. */
export const isSafeId = (id: string): boolean => ID_PATTERN.test(id);

/** A trimmed project name that is safe to use as a single directory name. */
export function validateProjectName(raw: unknown): string {
  const name = typeof raw === 'string' ? raw.trim() : '';
  if (!name) throw new InvalidInputError('Project name is required.');
  if (name.length > PROJECT_NAME_MAX) {
    throw new InvalidInputError(`Project name must be at most ${PROJECT_NAME_MAX} characters.`);
  }
  if (/[/\\\0]/.test(name) || name.startsWith('.')) {
    throw new InvalidInputError('Project name cannot contain slashes or start with a dot.');
  }
  if (CONTROL_CHARS.test(name)) {
    throw new InvalidInputError('Project name cannot contain control characters.');
  }
  return name;
}

/**
 * Resolve a client-supplied relative file path inside `base`. Rejects empty,
 * absolute, NUL-containing and escaping paths, and hidden segments.
 */
export function resolveInside(base: string, relative: unknown): string {
  const rel = typeof relative === 'string' ? relative.replace(/\\/g, '/').trim() : '';
  if (!rel || rel.length > FILENAME_MAX) throw new InvalidInputError('A valid filename is required.');
  if (rel.includes('\0') || path.isAbsolute(rel) || rel.startsWith('/')) {
    throw new InvalidInputError('Filename must be a relative path.');
  }
  const segments = rel.split('/');
  if (segments.some((s) => s === '' || s === '.' || s === '..' || s.startsWith('.'))) {
    throw new InvalidInputError('Filename cannot contain empty, dot or hidden segments.');
  }
  const root = path.resolve(base);
  const full = path.resolve(root, rel);
  if (!full.startsWith(root + path.sep)) throw new InvalidInputError('Filename escapes its folder.');
  return full;
}

/** A trimmed agent name: shown in the UI, terminals and teammates' instructions. */
export function validateAgentName(raw: unknown): string {
  const name = typeof raw === 'string' ? raw.trim() : '';
  if (!name) throw new InvalidInputError('Agent name is required.');
  if (name.length > AGENT_NAME_MAX || CONTROL_CHARS.test(name)) {
    throw new InvalidInputError(`Agent name must be at most ${AGENT_NAME_MAX} printable characters.`);
  }
  return name;
}

/** An optional role; '' clears it. Kept to one line of printable text. */
export function validateAgentRole(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'string') throw new InvalidInputError('Agent role must be text.');
  const role = raw.replace(/\s+/g, ' ').trim();
  if (role.length > AGENT_ROLE_MAX || CONTROL_CHARS.test(role)) {
    throw new InvalidInputError(`Agent role must be at most ${AGENT_ROLE_MAX} characters.`);
  }
  return role;
}

/** A launch setting (model, effort, thinking, permission mode, autocompact); '' clears it. */
export function validateLaunchSetting(field: string, raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'string' || (raw !== '' && !LAUNCH_SETTING.test(raw))) {
    throw new InvalidInputError(`Invalid ${field}.`);
  }
  return raw;
}

/** Launch flags: only the known booleans survive. */
export function validateAgentFlags(raw: unknown): { dangerouslySkipPermissions?: boolean; remoteControl?: boolean } | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new InvalidInputError('Invalid agent flags.');
  const flags: { dangerouslySkipPermissions?: boolean; remoteControl?: boolean } = {};
  for (const key of ['dangerouslySkipPermissions', 'remoteControl'] as const) {
    const value = (raw as Record<string, unknown>)[key];
    if (value === undefined) continue;
    if (typeof value !== 'boolean') throw new InvalidInputError(`Agent flag ${key} must be true or false.`);
    flags[key] = value;
  }
  return flags;
}
