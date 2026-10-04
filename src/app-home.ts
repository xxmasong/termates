/**
 * app-home.ts — the workspace data directory, ~/.termates.
 *
 * Before the Termates rename it was ~/.termhive. The first process that asks
 * moves the old directory over, so the web server and the daemon end up on the
 * same tree whichever of them starts first.
 */
import fs from 'fs';
import path from 'path';

const DIR_NAME = '.termates';
const LEGACY_DIR_NAME = '.termhive';

let checkedHome: string | null = null;

function moveLegacyDir(home: string, dir: string): void {
  const legacy = path.join(home, LEGACY_DIR_NAME);
  if (fs.existsSync(dir) || !fs.existsSync(legacy)) return;
  try {
    fs.renameSync(legacy, dir);
  } catch (err) {
    // The other process won the race; anything else is a real failure.
    if (!fs.existsSync(dir)) throw err;
  }
}

/** ~/.termates, resolved against the current HOME (tests swap it per case). */
export function appHomeDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '.';
  const dir = path.join(home, DIR_NAME);
  if (checkedHome !== home) {
    moveLegacyDir(home, dir);
    checkedHome = home;
  }
  return dir;
}

export const appHomePath = (...parts: string[]): string => path.join(appHomeDir(), ...parts);
