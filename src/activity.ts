import { watch, type FSWatcher } from 'chokidar';
import path from 'path';
import fs from 'fs';
import { randomUUID as uuid } from 'crypto';
import { SHARED_CONTENT_DIR } from './storage.js';
import type { ActivityEvent } from './types.js';

/** Events kept in memory and served to the UI (the newest). */
const MAX_EVENTS = 1000;
/**
 * The full history is appended to ~/.termhive/activity.jsonl and survives
 * restarts. Past this size the log rotates to activity.1.jsonl (one
 * generation), so a busy workspace keeps a long history in bounded disk.
 */
const LOG_ROTATE_BYTES = 20 * 1024 * 1024;
const events: ActivityEvent[] = [];
const watchers = new Map<string, FSWatcher>();

let broadcastFn: ((event: ActivityEvent) => void) | null = null;
let loadedFrom: string | null = null;

const logPath = () =>
  path.join(process.env.HOME || process.env.USERPROFILE || '.', '.termhive', 'activity.jsonl');

const isEvent = (value: unknown): value is ActivityEvent =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ActivityEvent).id === 'string' &&
  typeof (value as ActivityEvent).projectId === 'string' &&
  typeof (value as ActivityEvent).event === 'string' &&
  typeof (value as ActivityEvent).timestamp === 'string';

/** Read the newest events back from the log once per log file (i.e. per HOME). */
function ensureLoaded(): void {
  const file = logPath();
  if (loadedFrom === file) return;
  loadedFrom = file;
  events.length = 0;
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf-8');
  } catch {
    return; // no history yet
  }
  // End a torn last line so the next append starts on a line of its own.
  if (text && !text.endsWith('\n')) {
    try {
      fs.appendFileSync(file, '\n');
    } catch {
      /* read-only: loading still works */
    }
  }
  for (const line of text.split('\n').slice(-MAX_EVENTS - 1)) {
    if (!line) continue;
    try {
      const parsed: unknown = JSON.parse(line);
      if (isEvent(parsed)) events.push(parsed);
    } catch {
      /* a torn last line from a crash: skip it */
    }
  }
}

function persist(event: ActivityEvent): void {
  const file = logPath();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    try {
      if (fs.statSync(file).size > LOG_ROTATE_BYTES) {
        fs.renameSync(file, file.replace(/\.jsonl$/, '.1.jsonl'));
      }
    } catch {
      /* no log yet */
    }
    fs.appendFileSync(file, `${JSON.stringify(event)}\n`, { mode: 0o600 });
  } catch (error) {
    // History is best effort: a full disk must not break agents or the UI.
    console.error('[activity] could not persist event:', error);
  }
}

export function setBroadcast(fn: (event: ActivityEvent) => void) {
  broadcastFn = fn;
}

export function pushEvent(event: Omit<ActivityEvent, 'id' | 'timestamp'>) {
  ensureLoaded();
  const full: ActivityEvent = {
    ...event,
    id: uuid(),
    timestamp: new Date().toISOString(),
  };
  events.push(full);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  persist(full);
  broadcastFn?.(full);
}

export function getEvents(projectId?: string): ActivityEvent[] {
  ensureLoaded();
  if (projectId) return events.filter(e => e.projectId === projectId);
  return [...events];
}

/**
 * Start watching a project's shared content directory for file changes.
 */
export function watchProject(projectId: string, projectName: string) {
  if (watchers.has(projectId)) return;

  const dir = path.join(SHARED_CONTENT_DIR, projectName);
  fs.mkdirSync(dir, { recursive: true });

  console.log(`[activity] Watching shared content: ${dir}`);

  const watcher = watch(dir, {
    ignoreInitial: true,
    // Allow nested subfolders (up to 5 levels deep to avoid runaway watchers on symlink loops)
    depth: 5,
  });

  // Convert full filesystem path to shared-content-relative path with forward slashes
  const toRelative = (filePath: string): string =>
    path.relative(dir, filePath).replace(/\\/g, '/');

  // Skip hidden files/folders at any level (e.g. ".git", "subfolder/.DS_Store")
  const isHidden = (relPath: string): boolean =>
    relPath.split('/').some(seg => seg.startsWith('.'));

  watcher.on('add', (filePath: string) => {
    const rel = toRelative(filePath);
    if (!rel || isHidden(rel)) return;
    console.log(`[activity] File created: ${rel}`);
    pushEvent({
      projectId,
      event: 'content:created',
      detail: `File created: ${rel}`,
    });
  });

  watcher.on('change', (filePath: string) => {
    const rel = toRelative(filePath);
    if (!rel || isHidden(rel)) return;
    console.log(`[activity] File modified: ${rel}`);
    pushEvent({
      projectId,
      event: 'content:modified',
      detail: `File modified: ${rel}`,
    });
  });

  watcher.on('unlink', (filePath: string) => {
    const rel = toRelative(filePath);
    if (!rel || isHidden(rel)) return;
    console.log(`[activity] File deleted: ${rel}`);
    pushEvent({
      projectId,
      event: 'content:deleted',
      detail: `File deleted: ${rel}`,
    });
  });

  watcher.on('error', (err: unknown) => {
    console.error(`[activity] Watcher error for ${projectName}:`, err);
  });

  watchers.set(projectId, watcher);
}

export function unwatchProject(projectId: string) {
  const watcher = watchers.get(projectId);
  if (watcher) {
    watcher.close();
    watchers.delete(projectId);
  }
}
