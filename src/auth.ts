/**
 * auth.ts — read and clear each CLI's stored credentials.
 *
 * None of the three CLIs expose a login API a web page can drive: Claude and
 * Gemini sign in from inside their TUI, and Codex's device flow is a terminal
 * interaction. So this module reports status and handles logout, and the UI
 * hands login back to the CLI's own flow in a terminal.
 */

import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const run = promisify(execFile);

const HOME = process.env.HOME || os.homedir();
const CLAUDE_CREDS = path.join(HOME, '.claude', '.credentials.json');
const CODEX_AUTH = path.join(HOME, '.codex', 'auth.json');
const GEMINI_ACCOUNTS = path.join(HOME, '.gemini', 'google_accounts.json');
const GEMINI_OAUTH = path.join(HOME, '.gemini', 'oauth_creds.json');
const GEMINI_ENV = path.join(HOME, '.gemini', '.env');

export interface CliAuth {
  /** True when a usable credential is present. */
  loggedIn: boolean;
  /** Account identifier, when the CLI records one. */
  account: string | null;
  /** Plan or auth method, e.g. 'pro', 'ChatGPT', 'api-key'. */
  plan: string | null;
  /** ISO timestamp, when the credential carries an expiry. */
  expiresAt: string | null;
  /** True when an expiry is present and in the past. */
  expired: boolean;
  /** How to sign in, since none of these can be driven from the browser. */
  loginCommand: string;
  /** False when logout needs the CLI's own interactive flow. */
  canLogout: boolean;
}

export type AllAuth = Record<string, CliAuth>;

function readJson(file: string): Record<string, unknown> | null {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

function claudeAuth(): CliAuth {
  const base: CliAuth = {
    account: null,
    canLogout: true,
    expired: false,
    expiresAt: null,
    loggedIn: false,
    loginCommand: 'claude  (then /login)',
    plan: null,
  };

  const data = readJson(CLAUDE_CREDS);
  const oauth = data?.claudeAiOauth as Record<string, unknown> | undefined;
  if (!oauth?.accessToken) return base;

  const expiresAt = typeof oauth.expiresAt === 'number' ? oauth.expiresAt : null;
  return {
    ...base,
    account: (oauth.emailAddress as string) ?? null,
    expired: expiresAt ? expiresAt < Date.now() : false,
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    loggedIn: true,
    plan: (oauth.subscriptionType as string) ?? null,
  };
}

async function codexAuth(): Promise<CliAuth> {
  const base: CliAuth = {
    account: null,
    canLogout: true,
    expired: false,
    expiresAt: null,
    loggedIn: false,
    loginCommand: 'codex login --device-auth',
    plan: null,
  };

  const data = readJson(CODEX_AUTH);
  if (!data) return base;

  const tokens = data.tokens as Record<string, unknown> | undefined;
  const hasApiKey = Boolean(data.OPENAI_API_KEY);
  if (!tokens?.access_token && !hasApiKey) return base;

  // `codex login status` is the authoritative answer; fall back to the file.
  let plan = hasApiKey ? 'API key' : 'ChatGPT';
  try {
    const { stdout } = await run('codex', ['login', 'status'], { timeout: 8000 });
    const line = stdout.trim().split('\n')[0];
    if (line) plan = line.replace(/^Logged in using\s*/i, '').trim() || plan;
  } catch { /* keep the file-derived value */ }

  return {
    ...base,
    account: (tokens?.account_id as string) ?? null,
    loggedIn: true,
    plan,
  };
}

function geminiAuth(): CliAuth {
  const base: CliAuth = {
    account: null,
    // Gemini clears its credentials from inside the TUI (/auth); there is no
    // logout subcommand, so removing the files by hand is not offered.
    canLogout: false,
    expired: false,
    expiresAt: null,
    loggedIn: false,
    loginCommand: 'gemini  (then /auth)',
    plan: null,
  };

  const accounts = readJson(GEMINI_ACCOUNTS);
  const oauth = readJson(GEMINI_OAUTH);
  const hasApiKey = fs.existsSync(GEMINI_ENV) || Boolean(process.env.GEMINI_API_KEY);

  const active = (accounts?.active as string) ?? null;
  const expiry = typeof oauth?.expiry_date === 'number' ? oauth.expiry_date : null;

  if (!active && !hasApiKey) return base;

  return {
    ...base,
    account: active,
    expired: expiry ? expiry < Date.now() : false,
    expiresAt: expiry ? new Date(expiry).toISOString() : null,
    loggedIn: true,
    plan: hasApiKey ? 'api-key' : 'google-account',
  };
}

export async function getAuth(): Promise<AllAuth> {
  return {
    claude: claudeAuth(),
    codex: await codexAuth(),
    gemini: geminiAuth(),
  };
}

/** Clear a CLI's stored credentials. Returns false when it is not supported. */
export async function logout(cli: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (cli === 'codex') {
      await run('codex', ['logout'], { timeout: 15000 });
      return { ok: true };
    }

    if (cli === 'claude') {
      // Claude has no logout subcommand; removing the credential file is what
      // /logout does, and the CLI re-prompts on next launch.
      if (fs.existsSync(CLAUDE_CREDS)) fs.rmSync(CLAUDE_CREDS);
      return { ok: true };
    }

    return { ok: false, error: `${cli} signs out from inside its own TUI (/auth).` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
