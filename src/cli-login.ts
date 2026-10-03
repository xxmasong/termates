/**
 * cli-login.ts — run a CLI's own sign-in flow in a PTY for the browser.
 *
 * None of the CLIs expose a login API, so the "Connect" modal hosts a small
 * terminal instead: the CLI prints its sign-in link (or device code), the user
 * finishes in another tab, and pastes back any code the CLI asks for. One
 * session per browser socket; it dies with the socket or after a timeout.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import type { WebSocket } from 'ws';
import type { WSServerMessage } from './types.js';

type IPty = import('node-pty').IPty;

let pty: typeof import('node-pty') | null = null;
try {
  pty = await import('node-pty');
} catch {
  console.warn('[login] node-pty not available — in-browser sign-in disabled');
}

const LOGIN_TIMEOUT_MS = 15 * 60 * 1000;

/** The sign-in command per CLI. Subscription login first, never API keys. */
const COMMANDS: Record<string, { file: string; args: string[]; env?: Record<string, string | undefined> }> = {
  claude: { file: 'claude', args: ['auth', 'login', '--claudeai'] },
  // Device flow: no localhost callback, so it works from a remote browser.
  codex: { file: 'codex', args: ['login', '--device-auth'] },
  // Gemini runs in a throwaway HOME preset to Google login, so it goes
  // straight to "visit this URL / enter the authorization code" instead of
  // its TUI menu. See prepareGemini / promoteGemini.
  gemini: { file: 'gemini', args: [], env: { GEMINI_API_KEY: undefined, GOOGLE_API_KEY: undefined } },
};

const HOME = process.env.HOME || os.homedir();
const GEMINI_DIR = path.join(HOME, '.gemini');
const GEMINI_FILES = ['oauth_creds.json', 'google_accounts.json'];

/** A scratch HOME whose Gemini settings select Google login. */
function prepareGemini(): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'termhive-gemini-login-'));
  fs.mkdirSync(path.join(home, '.gemini'), { recursive: true });
  fs.writeFileSync(
    path.join(home, '.gemini', 'settings.json'),
    JSON.stringify({ security: { auth: { selectedType: 'oauth-personal' } } }),
  );
  return home;
}

/**
 * Copy the fresh Google credentials into the real ~/.gemini and switch the
 * CLI to use them. Only runs once sign-in has written oauth_creds.json, so a
 * cancelled attempt never touches the working API-key setup.
 */
function promoteGemini(scratchHome: string): void {
  fs.mkdirSync(GEMINI_DIR, { recursive: true });
  for (const name of GEMINI_FILES) {
    const from = path.join(scratchHome, '.gemini', name);
    if (fs.existsSync(from)) {
      fs.copyFileSync(from, path.join(GEMINI_DIR, name));
      fs.chmodSync(path.join(GEMINI_DIR, name), 0o600);
    }
  }

  const settingsPath = path.join(GEMINI_DIR, 'settings.json');
  let settings: Record<string, any> = {};
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  } catch { /* start fresh */ }
  settings.security = { ...settings.security, auth: { ...settings.security?.auth, selectedType: 'oauth-personal' } };
  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
}

interface LoginSession {
  proc: IPty;
  timer: NodeJS.Timeout;
  /** Gemini only: scratch HOME and the poll that watches it for credentials. */
  scratchHome?: string;
  watch?: NodeJS.Timeout;
}

const sessions = new Map<WebSocket, LoginSession>();

function send(ws: WebSocket, msg: WSServerMessage) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

export function startLogin(ws: WebSocket, cli: string, cols: number, rows: number): void {
  stopLogin(ws);

  // Own keys only: "constructor" or "__proto__" must not count as a CLI.
  const command = Object.hasOwn(COMMANDS, cli) ? COMMANDS[cli] : undefined;
  if (!command) {
    send(ws, { type: 'login:output', data: `\r\nUnknown CLI: ${cli}\r\n` });
    send(ws, { type: 'login:exit', exitCode: 1 });
    return;
  }
  if (!pty) {
    send(ws, { type: 'login:output', data: '\r\nnode-pty is not installed on the server.\r\n' });
    send(ws, { type: 'login:exit', exitCode: 1 });
    return;
  }

  const scratchHome = cli === 'gemini' ? prepareGemini() : undefined;

  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries({ ...process.env, NO_BROWSER: '1', ...command.env })) {
    if (value !== undefined) env[key] = value;
  }
  if (scratchHome) env.HOME = scratchHome;

  let proc: IPty;
  try {
    proc = pty.spawn(command.file, command.args, {
      cols: Math.max(20, cols || 80),
      rows: Math.max(5, rows || 24),
      cwd: scratchHome || env.HOME || process.cwd(),
      env,
      name: 'xterm-256color',
    });
  } catch (err) {
    send(ws, { type: 'login:output', data: `\r\nFailed to start ${command.file}: ${String(err)}\r\n` });
    send(ws, { type: 'login:exit', exitCode: 1 });
    if (scratchHome) fs.rmSync(scratchHome, { force: true, recursive: true });
    return;
  }

  const timer = setTimeout(() => {
    send(ws, { type: 'login:output', data: '\r\n\r\nSign-in timed out.\r\n' });
    send(ws, { type: 'login:exit', exitCode: 124 });
    stopLogin(ws);
  }, LOGIN_TIMEOUT_MS);

  const session: LoginSession = { proc, timer, scratchHome };
  sessions.set(ws, session);

  // Gemini stays in its TUI after signing in, so completion is detected by
  // its credentials appearing rather than by the process exiting.
  if (scratchHome) {
    session.watch = setInterval(() => {
      if (!fs.existsSync(path.join(scratchHome, '.gemini', 'oauth_creds.json'))) return;
      try {
        promoteGemini(scratchHome);
        console.log('[login] gemini: Google credentials installed');
        send(ws, { type: 'login:exit', exitCode: 0 });
      } catch (err) {
        send(ws, { type: 'login:output', data: `\r\nCould not save credentials: ${String(err)}\r\n` });
        send(ws, { type: 'login:exit', exitCode: 1 });
      }
      stopLogin(ws);
    }, 1000);
  }
  console.log(`[login] ${cli}: started ${command.file} ${command.args.join(' ')}`);

  proc.onData((data) => send(ws, { type: 'login:output', data }));
  proc.onExit(({ exitCode }) => {
    const current = sessions.get(ws);
    if (current?.proc !== proc) return;
    cleanup(current);
    sessions.delete(ws);
    console.log(`[login] ${cli}: exited ${exitCode}`);
    send(ws, { type: 'login:exit', exitCode });
  });
}

export function writeLogin(ws: WebSocket, data: string): void {
  sessions.get(ws)?.proc.write(data);
}

export function resizeLogin(ws: WebSocket, cols: number, rows: number): void {
  try {
    sessions.get(ws)?.proc.resize(Math.max(20, cols), Math.max(5, rows));
  } catch { /* process already gone */ }
}

export function stopLogin(ws: WebSocket): void {
  const session = sessions.get(ws);
  if (!session) return;
  sessions.delete(ws);
  cleanup(session);
  try { session.proc.kill(); } catch { /* already exited */ }
}

function cleanup(session: LoginSession): void {
  clearTimeout(session.timer);
  if (session.watch) clearInterval(session.watch);
  if (session.scratchHome) {
    // Give a just-killed process a moment to let go of its files.
    const dir = session.scratchHome;
    setTimeout(() => fs.rmSync(dir, { force: true, recursive: true }), 2000);
  }
}
