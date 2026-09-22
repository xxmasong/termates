import fs from 'fs';
import path from 'path';

const HOME = process.env.HOME || process.env.USERPROFILE || '.';
const CLAUDE_CREDS = path.join(HOME, '.claude', '.credentials.json');
const CODEX_AUTH = path.join(HOME, '.codex', 'auth.json');
const GEMINI_TMP = path.join(HOME, '.gemini', 'tmp');
/**
 * Google exposes no quota endpoint for the Generative Language API, so the
 * Gemini figure is counted locally from the CLI's own per-session logs and
 * compared against the published free-tier limits. It is an approximation of
 * this machine's usage, not an authoritative figure from Google.
 *   https://ai.google.dev/gemini-api/docs/rate-limits
 */
const GEMINI_DAILY_REQUEST_LIMIT = 1000;
const POLL_INTERVAL = 5 * 60 * 1000;
const RETRY_AFTER_429 = 2 * 60 * 1000;
/** Last good readings, so a restart during a 429 window still has something
 *  to show instead of dropping the meter. */
const USAGE_CACHE_FILE = path.join(HOME, '.termhive', 'usage-cache.json');

interface UsageData {
  session: { utilization: number; resetsAt: string } | null;
  week: { utilization: number; resetsAt: string } | null;
  updatedAt: string;
}

interface AllUsage {
  claude: UsageData | null;
  codex: UsageData | null;
  gemini: UsageData | null;
}

function loadCache(): {
  claude?: UsageData | null;
  codex?: UsageData | null;
  gemini?: UsageData | null;
} {
  try {
    if (!fs.existsSync(USAGE_CACHE_FILE)) return {};
    return JSON.parse(fs.readFileSync(USAGE_CACHE_FILE, 'utf-8'));
  } catch { return {}; }
}

function saveCache(): void {
  try {
    // Never let a null overwrite a good reading on disk: one CLI being rate
    // limited must not wipe the other CLI's last known figures.
    const prev = loadCache();
    fs.mkdirSync(path.dirname(USAGE_CACHE_FILE), { recursive: true });
    fs.writeFileSync(
      USAGE_CACHE_FILE,
      JSON.stringify({
        claude: claudeCache ?? prev.claude ?? null,
        codex: codexCache ?? prev.codex ?? null,
        gemini: geminiCache ?? prev.gemini ?? null,
      }),
    );
  } catch { /* cache is best-effort */ }
}

// --- Claude ---
let claudeCache: UsageData | null = null;
let claudeLastFetch = 0;
let claudeRateLimitedUntil = 0;

function getClaudeToken(): string | null {
  try {
    if (!fs.existsSync(CLAUDE_CREDS)) return null;
    const data = JSON.parse(fs.readFileSync(CLAUDE_CREDS, 'utf-8'));
    return data?.claudeAiOauth?.accessToken || null;
  } catch { return null; }
}

async function fetchClaudeUsage(): Promise<UsageData | null> {
  const token = getClaudeToken();
  if (!token) return null;
  if (Date.now() < claudeRateLimitedUntil) return claudeCache;

  try {
    const res = await fetch('https://api.anthropic.com/api/oauth/usage', {
      headers: {
        'Authorization': 'Bearer ' + token,
        'anthropic-beta': 'oauth-2025-04-20',
      },
    });
    if (res.status === 429) {
      claudeRateLimitedUntil = Date.now() + RETRY_AFTER_429;
      return claudeCache;
    }
    if (!res.ok) return claudeCache;

    const data = await res.json();
    claudeCache = {
      session: data.five_hour ? { utilization: data.five_hour.utilization, resetsAt: data.five_hour.resets_at } : null,
      week: data.seven_day ? { utilization: data.seven_day.utilization, resetsAt: data.seven_day.resets_at } : null,
      updatedAt: new Date().toISOString(),
    };
    claudeLastFetch = Date.now();
    saveCache();
    return claudeCache;
  } catch { return claudeCache; }
}

// --- Gemini ---
let geminiCache: UsageData | null = null;
let geminiLastFetch = 0;

/** Requests-per-day resets at midnight Pacific; approximate as UTC-8. */
function geminiDayResetsAt(): string {
  const now = new Date();
  const pacificOffsetMs = 8 * 60 * 60 * 1000;
  const pacificNow = new Date(now.getTime() - pacificOffsetMs);
  const nextMidnight = Date.UTC(
    pacificNow.getUTCFullYear(),
    pacificNow.getUTCMonth(),
    pacificNow.getUTCDate() + 1,
  );
  return new Date(nextMidnight + pacificOffsetMs).toISOString();
}

/** Count today's user turns across every Gemini CLI session on this machine. */
function countGeminiRequestsToday(): number {
  const cutoff = new Date(geminiDayResetsAt()).getTime() - 24 * 60 * 60 * 1000;
  let total = 0;

  let dirs: string[];
  try {
    dirs = fs.readdirSync(GEMINI_TMP);
  } catch {
    return 0;
  }

  for (const dir of dirs) {
    const logFile = path.join(GEMINI_TMP, dir, 'logs.json');
    try {
      if (!fs.existsSync(logFile)) continue;
      const entries = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        if (entry?.type !== 'user') continue;
        const at = Date.parse(entry?.timestamp ?? '');
        if (Number.isFinite(at) && at >= cutoff) total += 1;
      }
    } catch { /* skip an unreadable session log */ }
  }

  return total;
}

function readGeminiUsage(): UsageData | null {
  try {
    if (!fs.existsSync(GEMINI_TMP)) return null;
    const used = countGeminiRequestsToday();
    const resetsAt = geminiDayResetsAt();
    const utilization = Math.min(100, Math.round((used / GEMINI_DAILY_REQUEST_LIMIT) * 100));

    geminiCache = {
      // Gemini publishes a per-day limit, not a rolling session/week pair, so
      // the day figure is shown in the session row and the week row is left out.
      session: { utilization, resetsAt },
      week: null,
      updatedAt: new Date().toISOString(),
    };
    geminiLastFetch = Date.now();
    saveCache();
    return geminiCache;
  } catch {
    return geminiCache;
  }
}

// --- Codex ---
let codexCache: UsageData | null = null;
let codexLastFetch = 0;
let codexRateLimitedUntil = 0;

function getCodexAuth(): { accessToken: string; accountId: string } | null {
  try {
    if (!fs.existsSync(CODEX_AUTH)) return null;
    const data = JSON.parse(fs.readFileSync(CODEX_AUTH, 'utf-8'));
    const accessToken = data?.tokens?.access_token;
    const accountId = data?.tokens?.account_id;
    if (!accessToken) return null;
    return { accessToken, accountId: accountId || '' };
  } catch { return null; }
}

async function fetchCodexUsage(): Promise<UsageData | null> {
  const auth = getCodexAuth();
  if (!auth) return null;
  if (Date.now() < codexRateLimitedUntil) return codexCache;

  try {
    const headers: Record<string, string> = {
      'Authorization': 'Bearer ' + auth.accessToken,
      'User-Agent': 'codex-cli',
    };
    if (auth.accountId) headers['ChatGPT-Account-Id'] = auth.accountId;

    const res = await fetch('https://chatgpt.com/backend-api/wham/usage', { headers });
    if (res.status === 429) {
      codexRateLimitedUntil = Date.now() + RETRY_AFTER_429;
      return codexCache;
    }
    if (!res.ok) return codexCache;

    const data = await res.json();
    const rl = data.rate_limit;
    codexCache = {
      session: rl?.primary_window ? {
        utilization: rl.primary_window.used_percent,
        resetsAt: new Date(rl.primary_window.reset_at * 1000).toISOString(),
      } : null,
      week: rl?.secondary_window ? {
        utilization: rl.secondary_window.used_percent,
        resetsAt: new Date(rl.secondary_window.reset_at * 1000).toISOString(),
      } : null,
      updatedAt: new Date().toISOString(),
    };
    codexLastFetch = Date.now();
    saveCache();
    return codexCache;
  } catch { return codexCache; }
}

// --- Public API ---
export async function getUsage(): Promise<AllUsage> {
  const now = Date.now();
  const claude = (claudeCache && now - claudeLastFetch < POLL_INTERVAL) ? claudeCache : await fetchClaudeUsage();
  const codex = (codexCache && now - codexLastFetch < POLL_INTERVAL) ? codexCache : await fetchCodexUsage();
  // Local read, so it is cheap enough to recompute whenever it is stale.
  const gemini = (geminiCache && now - geminiLastFetch < POLL_INTERVAL) ? geminiCache : readGeminiUsage();
  return { claude, codex, gemini };
}

export function startPolling() {
  const persisted = loadCache();
  if (!claudeCache && persisted.claude) claudeCache = persisted.claude;
  if (!codexCache && persisted.codex) codexCache = persisted.codex;
  if (!geminiCache && persisted.gemini) geminiCache = persisted.gemini;

  const poll = async () => {
    const claude = await fetchClaudeUsage();
    const codex = await fetchCodexUsage();
    if (claude) console.log('[usage] Claude: session ' + claude.session?.utilization + '%, week ' + claude.week?.utilization + '%');
    if (codex) console.log('[usage] Codex: session ' + codex.session?.utilization + '%, week ' + codex.week?.utilization + '%');
    const gemini = readGeminiUsage();
    if (gemini) console.log('[usage] Gemini: day ' + gemini.session?.utilization + '% (local count)');
  };
  poll();
  setInterval(poll, POLL_INTERVAL);
}

export function stopPolling() {}
