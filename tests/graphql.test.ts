import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import type { DaemonClient } from '../src/daemon/client.js';

type Yoga = ReturnType<typeof import('../src/graphql/yoga.js').createGraphQLHandler>;
type PubSub = ReturnType<typeof import('../src/graphql/pubsub.js').createWorkspacePubSub>;

const running = new Set<string>();
const daemon = {
  request: async (type: string, payload?: { agentId?: string }) => {
    if (type === 'agent:statuses') {
      return { statuses: Object.fromEntries([...running].map((id) => [id, 'running'])) };
    }
    if (type === 'agent:preview') return { preview: `> ${payload?.agentId?.slice(0, 4)}` };
    if (type === 'agent:start') {
      if (payload?.agentId) running.add(payload.agentId);
      return { ok: true };
    }
    if (type === 'agent:stop') {
      if (payload?.agentId) running.delete(payload.agentId);
      return {};
    }
    return {};
  },
} as unknown as DaemonClient;

describe('GraphQL API', () => {
  const saved = { ...process.env };
  let home = '';
  let yoga: Yoga;
  let pubsub: PubSub;

  before(async () => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'termhive-gql-'));
    process.env.HOME = home;
    delete process.env.TERMHIVE_MAX_PROJECTS;
    process.env.TERMHIVE_MAX_AGENTS = '2';
    const { WorkspaceService } = await import('../src/services/workspace-service.js');
    const { createWorkspacePubSub } = await import('../src/graphql/pubsub.js');
    const { createGraphQLHandler } = await import('../src/graphql/yoga.js');
    pubsub = createWorkspacePubSub();
    const service = new WorkspaceService(daemon, {
      agentStatus: (agentId, status) => pubsub.publish('agentStatus', { agentId, status }),
      contentUpdated: (projectId, filename) =>
        pubsub.publish('contentUpdated', { projectId, filename }),
    });
    yoga = createGraphQLHandler(service, pubsub);
  });

  after(async () => {
    // startAgent begins watching the project's files; stop so the process can exit.
    const activity = await import('../src/activity.js');
    const storage = await import('../src/storage.js');
    for (const project of storage.listProjects()) activity.unwatchProject(project.id);
    process.env = saved;
    fs.rmSync(home, { recursive: true, force: true });
  });

  const gql = async (query: string, variables?: Record<string, unknown>) => {
    const response = await yoga.fetch('http://workspace/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    return (await response.json()) as {
      data?: Record<string, any>;
      errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
    };
  };

  it('creates a project and agents, then reads the whole sidebar in one query', async () => {
    const created = await gql(
      `mutation($input: CreateProjectInput!) { createProject(input: $input) { id name } }`,
      { input: { name: 'shop', cwd: path.join(home, 'shop') } },
    );
    const projectId = created.data?.createProject.id;
    assert.ok(projectId);
    for (const [name, cli] of [
      ['Ana', 'CLAUDE'],
      ['Ben', 'CODEX'],
    ]) {
      const r = await gql(
        `mutation($input: CreateAgentInput!) { createAgent(input: $input) { name cli status } }`,
        { input: { projectId, name, cli, role: 'backend' } },
      );
      assert.equal(r.errors, undefined);
      assert.equal(r.data?.createAgent.status, 'STOPPED');
    }

    const sidebar = await gql(
      `{ projects { name agentCount agents { name cli status preview } } }`,
    );
    assert.deepEqual(
      sidebar.data?.projects[0].agents.map((a: { name: string }) => a.name),
      ['Ana', 'Ben'],
    );
    assert.equal(sidebar.data?.projects[0].agentCount, 2);
    assert.match(sidebar.data?.projects[0].agents[0].preview, /^> /);
  });

  it('reports plan limits and not-found as coded errors', async () => {
    const { data } = await gql(`{ projects { id } }`);
    const projectId = data?.projects[0].id;
    const limited = await gql(
      `mutation($input: CreateAgentInput!) { createAgent(input: $input) { id } }`,
      { input: { projectId, name: 'Cy', cli: 'GEMINI' } },
    );
    assert.equal(limited.errors?.[0].extensions?.code, 'PLAN_LIMIT');
    assert.equal(limited.errors?.[0].extensions?.limit, 2);
    assert.match(limited.errors?.[0].message ?? '', /Upgrade to add more/);

    const missing = await gql(
      `mutation { updateProject(id: "nope", input: { name: "x" }) { id } }`,
    );
    assert.equal(missing.errors?.[0].extensions?.code, 'NOT_FOUND');
  });

  it('starts and stops agents, and streams status changes to subscribers', async () => {
    const { data } = await gql(`{ projects { id agents { id name } } }`);
    const project = data?.projects[0];
    const ana = project.agents[0];

    const events: string[] = [];
    const iterator = pubsub.subscribe('agentStatus')[Symbol.asyncIterator]();
    const next = iterator.next().then((r) => events.push(`${r.value.agentId}:${r.value.status}`));

    const started = await gql(
      `mutation($p: ID!, $id: ID!) { startAgent(projectId: $p, id: $id) { status } }`,
      { p: project.id, id: ana.id },
    );
    assert.equal(started.data?.startAgent.status, 'RUNNING');
    const stopped = await gql(
      `mutation($p: ID!, $id: ID!) { stopAgent(projectId: $p, id: $id) { status } }`,
      { p: project.id, id: ana.id },
    );
    assert.equal(stopped.data?.stopAgent.status, 'STOPPED');
    await next;
    assert.deepEqual(events, [`${ana.id}:stopped`]);
    await iterator.return?.();
  });

  it('masks unexpected errors and exposes the schema for codegen', async () => {
    const bad = await gql(`{ nope }`);
    assert.ok(bad.errors?.length);
    const { printSchema } = await import('graphql');
    const { schema } = await import('../src/graphql/schema.js');
    const sdl = printSchema(schema);
    for (const piece of ['type Project', 'type Agent', 'enum AgentStatus', 'type Subscription']) {
      assert.ok(sdl.includes(piece), piece);
    }
  });
});
