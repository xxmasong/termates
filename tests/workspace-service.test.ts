import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import express from 'express';

import type { DaemonClient } from '../src/daemon/client.js';

type Service = import('../src/services/workspace-service.js').WorkspaceService;

/** A daemon double: records calls, reports one agent as running. */
const fakeDaemon = (running: Set<string>) => {
  const calls: string[] = [];
  const daemon = {
    request: async (type: string, payload?: { agentId?: string }) => {
      calls.push(type);
      switch (type) {
        case 'agent:statuses':
          return { statuses: Object.fromEntries([...running].map((id) => [id, 'running'])) };
        case 'agent:preview':
          return { preview: `preview of ${payload?.agentId}` };
        case 'agent:start':
          if (payload?.agentId) running.add(payload.agentId);
          return { ok: true };
        case 'agent:inject':
          return { delivered: true };
        default:
          return {};
      }
    },
  };
  return { daemon: daemon as unknown as DaemonClient, calls };
};

describe('WorkspaceService + REST adapter', () => {
  const saved = { ...process.env };
  let home = '';
  let service: Service;
  let base = '';
  let server: ReturnType<express.Express['listen']>;
  const statusEvents: string[] = [];
  const running = new Set<string>();
  const { daemon, calls } = fakeDaemon(running);

  before(async () => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'termhive-service-'));
    process.env.HOME = home;
    delete process.env.TERMHIVE_MAX_PROJECTS;
    delete process.env.TERMHIVE_MAX_AGENTS;
    process.env.TERMHIVE_MAX_AGENTS = '2';
    const { WorkspaceService } = await import('../src/services/workspace-service.js');
    const { createRouter } = await import('../src/routes.js');
    service = new WorkspaceService(daemon, {
      agentStatus: (id, status) => statusEvents.push(`${id}:${status}`),
      contentUpdated: () => undefined,
    });
    const app = express();
    app.use(express.json());
    app.use('/api', createRouter(service));
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  });

  after(() => {
    server.close();
    process.env = saved;
    fs.rmSync(home, { recursive: true, force: true });
  });

  const json = (method: string, url: string, body?: unknown) =>
    fetch(`${base}${url}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  it('creates projects and agents, with validation and 404s as before', async () => {
    assert.equal((await json('POST', '/projects', { name: 'p' })).status, 400);
    const project = await (
      await json('POST', '/projects', { name: 'p', cwd: path.join(home, 'p') })
    ).json();
    assert.equal(project.name, 'p');

    const badCli = await json('POST', `/projects/${project.id}/agents`, { name: 'a', cli: 'vim' });
    assert.equal(badCli.status, 400);
    assert.match((await badCli.json()).error, /cli must be one of/);

    const a = await (
      await json('POST', `/projects/${project.id}/agents`, {
        name: 'Ana',
        cli: 'claude',
        role: 'backend',
      })
    ).json();
    assert.equal(a.cwd, path.join(home, 'p'));
    await json('POST', `/projects/${project.id}/agents`, { name: 'Ben', cli: 'codex' });

    const limited = await json('POST', `/projects/${project.id}/agents`, {
      name: 'Cy',
      cli: 'claude',
    });
    assert.equal(limited.status, 403);
    assert.equal((await limited.json()).code, 'PLAN_LIMIT');

    const missing = await json('PUT', '/projects/nope', { name: 'x' });
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { error: 'Project not found', code: 'NOT_FOUND' });
  });

  it('merges live statuses, previews and teammates from the daemon', async () => {
    const [project] = service.listProjects();
    const [ana, ben] = await service.listAgents(project.id);
    assert.equal(ana.status, 'stopped');

    const started = await json('POST', `/projects/${project.id}/agents/${ana.id}/start`);
    assert.deepEqual(await started.json(), { status: 'running' });
    const agents = await (await json('GET', `/projects/${project.id}/agents`)).json();
    assert.equal(agents.find((x: { id: string }) => x.id === ana.id).status, 'running');

    const previews = await (await json('GET', `/projects/${project.id}/agents/previews`)).json();
    assert.equal(previews[ben.id], `preview of ${ben.id}`);

    const mates = await (
      await json('GET', `/projects/${project.id}/agents/${ben.id}/teammates`)
    ).json();
    assert.deepEqual(
      mates.teammates.map((t: { name: string; status: string }) => [t.name, t.status]),
      [['Ana', 'running']],
    );

    await json('POST', `/projects/${project.id}/agents/${ana.id}/stop`);
    assert.ok(statusEvents.includes(`${ana.id}:stopped`));
  });

  it('routes messages by name, then by role, and rejects unknown targets', async () => {
    const [project] = service.listProjects();
    const [ana, ben] = await service.listAgents(project.id);
    const byRole = await (
      await json('POST', `/projects/${project.id}/messages`, {
        fromAgentId: ben.id,
        target: 'backend',
        message: 'hi',
      })
    ).json();
    assert.deepEqual(byRole, { delivered: true, toAgentId: ana.id, toAgentName: 'Ana' });
    const unknown = await json('POST', `/projects/${project.id}/messages`, {
      fromAgentId: ben.id,
      target: 'zed',
      message: 'hi',
    });
    assert.equal(unknown.status, 404);
    assert.ok(calls.includes('agent:inject'));
  });

  it('handles shared content and wiki round-trips', async () => {
    const [project] = service.listProjects();
    const created = await json('POST', `/projects/${project.id}/content`, {
      filename: 'notes/plan.md',
      content: '# plan',
    });
    assert.equal(created.status, 201);
    const got = await (await json('GET', `/projects/${project.id}/content/notes/plan.md`)).json();
    assert.equal(got.content, '# plan');
    assert.equal(
      (await json('DELETE', `/projects/${project.id}/content/notes/plan.md`)).status,
      204,
    );
    assert.equal((await json('GET', `/projects/${project.id}/content/notes/plan.md`)).status, 404);
    const wiki = await (await json('GET', `/projects/${project.id}/wiki/status`)).json();
    assert.equal(typeof wiki.initialized, 'boolean');
  });
});
