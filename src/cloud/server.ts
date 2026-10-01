/**
 * TermHive Cloud control plane (termhive-cloud.service, root, :3200).
 *
 * Serves the built client (landing, auth pages, /app shell), the /auth API,
 * and proxies everything else — /api, /ws, /claude-chat — to the signed-in
 * user's own workspace on 127.0.0.1:<port_base>.
 */

import http from 'node:http';
import path from 'node:path';

import express, { type NextFunction, type Request, type Response } from 'express';

import { Accounts } from './accounts.js';
import { createAuthRouter } from './auth-routes.js';
import { loadConfig } from './config.js';
import { CloudDb } from './db.js';
import { KeyStore } from './firebase-token.js';
import { Provisioner } from './provisioner.js';
import { WorkspaceProxy } from './proxy.js';

/** Paths the client router renders; all get index.html. */
const CLIENT_ROUTES = [
  /^\/(login|signup|verify-email|forgot-password|reset-password)?\/?$/,
  /^\/account(\/.*)?$/,
  /^\/app(\/.*)?$/,
];
const SESSION_SWEEP_MS = 60 * 60 * 1000;
const IMMUTABLE = 'public, max-age=31536000, immutable';

const config = loadConfig();
const db = new CloudDb(config.dbPath);
const provisioner = new Provisioner(db, config);
const accounts = new Accounts(db, config);
const proxy = new WorkspaceProxy(db, config, provisioner);
const indexHtml = path.join(config.clientDist, 'index.html');

const app = express();
app.disable('x-powered-by');

/** Baseline browser hardening for every response, proxied ones included. */
const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Firebase sign-in popups need to talk back to their opener.
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Permissions-Policy': 'camera=(), geolocation=(), payment=(), microphone=(self)',
};
app.use((_req, res, next) => {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);
  next();
});

app.use('/auth', createAuthRouter({ db, config, accounts, provisioner, keys: new KeyStore() }));

app.use(
  express.static(config.clientDist, {
    index: false,
    setHeaders: (res, file) => {
      if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', IMMUTABLE);
    },
  }),
);

app.get(CLIENT_ROUTES, (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(indexHtml);
});

app.use((req, res) => {
  void proxy.handleHttp(req, res).catch((err) => {
    console.error('[cloud] proxy error', err);
    if (!res.headersSent) res.status(502).json({ error: 'Workspace unavailable.' });
  });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[cloud] request failed', err);
  if (!res.headersSent) res.status(500).json({ error: 'Something went wrong.' });
});

const server = http.createServer(app);
server.on('upgrade', (req, socket, head) => {
  void proxy.handleUpgrade(req, socket, head).catch(() => socket.destroy());
});

server.listen(config.port, config.host, () => {
  console.log(`[cloud] listening on http://${config.host}:${config.port}`);
  console.log(
    `[cloud] firebase ${config.firebase ? `configured (${config.firebase.projectId})` : 'NOT configured'}, signups ${config.signupMode}`,
  );
  if (config.devSessions)
    console.warn('[cloud] TERMHIVE_DEV_SESSIONS=1 — dev sessions are enabled');
});

// Per-user firewall rules live only in the kernel; rebuild them on start and
// finish any provisioning a restart interrupted.
void provisioner
  .syncFirewall()
  .then(() => console.log('[cloud] firewall rules synced'))
  .catch((err) => console.error('[cloud] firewall sync failed', err));
for (const ws of db.listWorkspaces()) {
  const user = db.userById(ws.user_id);
  if (user && ws.state === 'provisioning') void provisioner.provision(user);
}

setInterval(() => db.deleteExpiredSessions(), SESSION_SWEEP_MS).unref();

const shutdown = (signal: string) => {
  console.log(`[cloud] ${signal} — shutting down (workspaces keep running)`);
  server.close();
  db.close();
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
