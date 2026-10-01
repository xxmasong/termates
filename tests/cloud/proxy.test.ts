import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';

import { WebSocket, WebSocketServer } from 'ws';

import { loadConfig } from '../../src/cloud/config.js';
import { CloudDb } from '../../src/cloud/db.js';
import type { Provisioner } from '../../src/cloud/provisioner.js';
import { WorkspaceProxy } from '../../src/cloud/proxy.js';
import { createSession } from '../../src/cloud/sessions.js';

const ORIGIN = 'https://th.example';

const listen = async (server: http.Server) => {
  server.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  return (server.address() as AddressInfo).port;
};

describe('WorkspaceProxy', () => {
  const db = new CloudDb(':memory:');
  let upstream: http.Server;
  let proxyServer: http.Server;
  let base = '';
  let cookie = '';
  let pendingCookie = '';
  const seen: http.IncomingHttpHeaders[] = [];

  before(async () => {
    upstream = http.createServer((req, res) => {
      seen.push(req.headers);
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': 'th_session=evil; Path=/',
        });
        res.end(JSON.stringify({ method: req.method, url: req.url, body }));
      });
    });
    const wss = new WebSocketServer({ server: upstream, path: '/ws' });
    wss.on('connection', (socket) => socket.on('message', (data) => socket.send(`echo:${data}`)));
    const upstreamPort = await listen(upstream);

    const user = db.insertUser({
      firebaseUid: 'a',
      email: 'a@x.test',
      name: null,
      avatarUrl: null,
      plan: 'free',
      role: 'user',
    });
    db.insertWorkspace({
      userId: user.id,
      unixUser: 'th-a',
      portBase: upstreamPort,
      state: 'running',
    });
    cookie = `th_session=${createSession(db, user.id, { ip: null, userAgent: null }).token}`;

    const waiting = db.insertUser({
      firebaseUid: 'b',
      email: 'b@x.test',
      name: null,
      avatarUrl: null,
      plan: 'free',
      role: 'user',
    });
    db.insertWorkspace({
      userId: waiting.id,
      unixUser: 'th-b',
      portBase: 4990,
      state: 'provisioning',
    });
    pendingCookie = `th_session=${createSession(db, waiting.id, { ip: null, userAgent: null }).token}`;

    const provisioner = { start: async () => undefined } as unknown as Provisioner;
    const proxy = new WorkspaceProxy(db, loadConfig({ CLOUD_ORIGINS: ORIGIN }), provisioner);
    proxyServer = http.createServer((req, res) => void proxy.handleHttp(req, res));
    proxyServer.on('upgrade', (req, socket, head) => void proxy.handleUpgrade(req, socket, head));
    base = `127.0.0.1:${await listen(proxyServer)}`;
  });

  after(() => {
    proxyServer.close();
    upstream.close();
  });

  it('answers 401 JSON to XHR and redirects navigations without a session', async () => {
    const xhr = await fetch(`http://${base}/api/projects`);
    assert.equal(xhr.status, 401);
    assert.equal((await xhr.json()).code, 'UNAUTHENTICATED');
    // fetch() forces Sec-Fetch-Mode: cors, so send a browser navigation by hand.
    const nav = await new Promise<http.IncomingMessage>((resolve) =>
      http.get(
        `http://${base}/api/projects`,
        { headers: { 'Sec-Fetch-Mode': 'navigate' } },
        resolve,
      ),
    );
    nav.resume();
    assert.equal(nav.statusCode, 302);
    assert.equal(nav.headers.location, '/login');
  });

  it('forwards method, path and body, and strips the cookie', async () => {
    const response = await fetch(`http://${base}/api/projects?x=1`, {
      method: 'POST',
      headers: { Cookie: `${cookie}; other=1`, Origin: ORIGIN, 'Content-Type': 'application/json' },
      body: '{"name":"p"}',
    });
    assert.deepEqual(await response.json(), {
      method: 'POST',
      url: '/api/projects?x=1',
      body: '{"name":"p"}',
    });
    const headers = seen.at(-1);
    assert.equal(headers?.cookie, undefined);
    assert.equal(headers?.['x-forwarded-proto'], 'https');
    assert.equal(response.headers.get('set-cookie'), null, 'workspace cookies are dropped');
  });

  it('drops hop-by-hop and smuggling headers', async () => {
    await fetch(`http://${base}/api/projects`, {
      headers: {
        Cookie: cookie,
        'Proxy-Authorization': 'Basic x',
        'X-Forwarded-Host': 'evil.example',
        'X-Forwarded-For': '6.6.6.6, 100.64.0.9',
      },
    });
    const headers = seen.at(-1);
    assert.equal(headers?.['proxy-authorization'], undefined);
    assert.equal(headers?.['x-forwarded-host'], undefined);
    assert.equal(headers?.['x-forwarded-for'], '100.64.0.9', 'only the trusted last hop is kept');
  });

  it('refuses a foreign Origin', async () => {
    const response = await fetch(`http://${base}/api/projects`, {
      method: 'POST',
      headers: { Cookie: cookie, Origin: 'https://evil.example' },
    });
    assert.equal(response.status, 403);
  });

  it('reports a workspace that is still provisioning', async () => {
    const response = await fetch(`http://${base}/api/projects`, {
      headers: { Cookie: pendingCookie },
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'WORKSPACE_PROVISIONING');
  });

  it('proxies WebSocket upgrades', async () => {
    const socket = new WebSocket(`ws://${base}/ws`, {
      headers: { Cookie: cookie, Origin: ORIGIN },
    });
    const reply = await new Promise<string>((resolve, reject) => {
      socket.on('open', () => socket.send('hi'));
      socket.on('message', (data) => resolve(String(data)));
      socket.on('error', reject);
    });
    assert.equal(reply, 'echo:hi');
    socket.close();
  });

  it('rejects WebSocket upgrades without a session or from a foreign origin', async () => {
    for (const headers of [
      { Origin: ORIGIN },
      { Cookie: cookie, Origin: 'https://evil.example' },
    ]) {
      const socket = new WebSocket(`ws://${base}/ws`, { headers });
      const status = await new Promise<number>((resolve) => {
        socket.on('unexpected-response', (_req, res) => resolve(res.statusCode ?? 0));
        socket.on('error', () => resolve(-1));
      });
      assert.ok(status === 401 || status === 403, String(status));
    }
  });
});
