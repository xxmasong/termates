/**
 * proxy.ts — pipe a signed-in user's traffic to their own workspace.
 *
 * Plain http/net, no proxy dependency. The Cookie header is dropped before
 * forwarding (workspaces never see th_session) and WebSocket upgrades are
 * spliced at the TCP level after the handshake request is replayed.
 */

import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import net from 'node:net';
import type { Duplex } from 'node:stream';

import type { CloudConfig } from './config.js';
import type { CloudDb, UserRow, WorkspaceRow } from './db.js';
import { clientIp, isAllowedOrigin, isNavigation } from './guards.js';
import type { Provisioner } from './provisioner.js';
import { resolveSession } from './sessions.js';

const TOUCH_INTERVAL_MS = 60_000;
const LOGIN_PATH = '/login';

type Target =
  | { ok: true; port: number; user: UserRow }
  | { ok: false; status: number; code: string; error: string };

export class WorkspaceProxy {
  private readonly lastTouch = new Map<number, number>();

  constructor(
    private readonly db: CloudDb,
    private readonly config: CloudConfig,
    private readonly provisioner: Provisioner,
  ) {}

  /** Resolve the caller's workspace port, starting a stopped workspace first. */
  private async target(req: IncomingMessage): Promise<Target> {
    const resolved = resolveSession(this.db, req);
    if (!resolved)
      return { ok: false, status: 401, code: 'UNAUTHENTICATED', error: 'Not signed in.' };

    // Browsers send Origin on WebSocket handshakes and on cross-origin or
    // state-changing requests; if it is there it must be ours (SameSite=Lax
    // already keeps the cookie off cross-site subrequests).
    if (req.headers.origin !== undefined && !isAllowedOrigin(req, this.config.allowedOrigins)) {
      return { ok: false, status: 403, code: 'BAD_ORIGIN', error: 'Cross-site request refused.' };
    }

    const { user } = resolved;
    let ws = this.db.workspaceByUser(user.id);
    if (ws?.state === 'stopped') {
      await this.provisioner.start(user);
      ws = this.db.workspaceByUser(user.id);
    }
    if (!ws || ws.state === 'provisioning') {
      return {
        ok: false,
        status: 503,
        code: 'WORKSPACE_PROVISIONING',
        error: 'Your workspace is still being prepared.',
      };
    }
    if (ws.state !== 'running') {
      return {
        ok: false,
        status: 503,
        code: 'WORKSPACE_ERROR',
        error: "Your workspace couldn't be started.",
      };
    }
    this.touch(ws);
    return { ok: true, port: ws.port_base, user };
  }

  private touch(ws: WorkspaceRow): void {
    const now = Date.now();
    if (now - (this.lastTouch.get(ws.user_id) ?? 0) < TOUCH_INTERVAL_MS) return;
    this.lastTouch.set(ws.user_id, now);
    this.db.touchWorkspace(ws.user_id);
  }

  /** The workspace refused the connection: its unit is down, so start it. */
  private onRefused(user: UserRow): void {
    this.db.setWorkspaceState(user.id, 'stopped');
    void this.provisioner.start(user);
  }

  private forwardHeaders(req: IncomingMessage, port: number): http.OutgoingHttpHeaders {
    const headers: http.OutgoingHttpHeaders = { ...req.headers };
    delete headers.cookie;
    headers.host = `127.0.0.1:${port}`;
    headers['x-forwarded-for'] = clientIp(req);
    headers['x-forwarded-proto'] = 'https';
    return headers;
  }

  async handleHttp(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const target = await this.target(req);
    if (!target.ok) {
      if (target.status === 401 && isNavigation(req)) {
        res.writeHead(302, { Location: LOGIN_PATH, 'Cache-Control': 'no-store' });
        res.end();
        return;
      }
      res.writeHead(target.status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      });
      res.end(JSON.stringify({ error: target.error, code: target.code }));
      return;
    }

    const upstream = http.request(
      {
        host: '127.0.0.1',
        port: target.port,
        method: req.method,
        path: req.url,
        headers: this.forwardHeaders(req, target.port),
      },
      (response) => {
        res.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(res);
      },
    );
    upstream.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ECONNREFUSED') this.onRefused(target.user);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Workspace unavailable.', code: 'WORKSPACE_UNAVAILABLE' }));
      } else {
        res.destroy();
      }
    });
    req.on('aborted', () => upstream.destroy());
    req.pipe(upstream);
  }

  async handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): Promise<void> {
    socket.on('error', () => socket.destroy());
    const target = await this.target(req);
    if (!target.ok) {
      socket.end(
        `HTTP/1.1 ${target.status} ${http.STATUS_CODES[target.status]}\r\nConnection: close\r\n\r\n`,
      );
      return;
    }

    const upstream = net.connect(target.port, '127.0.0.1', () => {
      const headers = this.forwardHeaders(req, target.port);
      let preamble = `${req.method} ${req.url} HTTP/1.1\r\n`;
      for (const [name, value] of Object.entries(headers)) {
        if (value === undefined) continue;
        for (const item of Array.isArray(value) ? value : [value])
          preamble += `${name}: ${item}\r\n`;
      }
      upstream.write(`${preamble}\r\n`);
      if (head.length) upstream.write(head);
      upstream.pipe(socket);
      socket.pipe(upstream);
    });
    upstream.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ECONNREFUSED') this.onRefused(target.user);
      socket.destroy();
    });
    socket.on('close', () => upstream.destroy());
    upstream.on('close', () => socket.destroy());
  }
}
