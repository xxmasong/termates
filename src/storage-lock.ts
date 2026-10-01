/**
 * storage-lock.ts — a cross-process mutex for storage writes.
 *
 * The web server and the daemon both read-modify-write the same project.json
 * files (the daemon records agent status/pid, the server edits projects and
 * agents). Without a lock one write can silently drop the other's change, and
 * concurrent creates can slip past the plan's agent limit. Writes are rare and
 * short, so one workspace-wide lock (an atomic mkdir) is enough.
 */

import fs from 'fs';

const WAIT_STEP_MS = 5;
const ACQUIRE_TIMEOUT_MS = 3_000;
/** A lock older than this was left by a crashed process. */
const STALE_MS = 10_000;

const sleeper = new Int32Array(new SharedArrayBuffer(4));
const sleepSync = (ms: number) => Atomics.wait(sleeper, 0, 0, ms);

let depth = 0;

export class StorageBusyError extends Error {
  constructor() {
    super('Storage is busy, please retry.');
    this.name = 'StorageBusyError';
  }
}

/** Run `fn` holding the lock at `lockDir`. Re-entrant within one process. */
export function withStorageLock<T>(lockDir: string, fn: () => T): T {
  if (depth > 0) {
    depth += 1;
    try {
      return fn();
    } finally {
      depth -= 1;
    }
  }

  const deadline = Date.now() + ACQUIRE_TIMEOUT_MS;
  for (;;) {
    try {
      fs.mkdirSync(lockDir);
      break;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
      try {
        if (Date.now() - fs.statSync(lockDir).mtimeMs > STALE_MS) {
          fs.rmSync(lockDir, { recursive: true, force: true });
          continue;
        }
      } catch {
        continue; // released between mkdir and stat
      }
      if (Date.now() > deadline) throw new StorageBusyError();
      sleepSync(WAIT_STEP_MS);
    }
  }

  depth = 1;
  try {
    return fn();
  } finally {
    depth = 0;
    fs.rmSync(lockDir, { recursive: true, force: true });
  }
}
