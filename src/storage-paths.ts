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
