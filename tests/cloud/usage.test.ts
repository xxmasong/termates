import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { workspaceUsage } from '../../src/cloud/usage.js';

describe('workspaceUsage', () => {
  it('counts projects and agents across all projects on the workspace port', async () => {
    const calls: string[] = [];
    const data: Record<string, unknown> = {
      'http://127.0.0.1:4010/api/projects': [{ id: 'a' }, { id: 'b' }],
      'http://127.0.0.1:4010/api/projects/a/agents': [{}, {}],
      'http://127.0.0.1:4010/api/projects/b/agents': [{}],
    };
    const usage = await workspaceUsage({ port_base: 4010 }, async (url) => {
      calls.push(url);
      return data[url];
    });
    assert.deepEqual(usage, { projects: 2, agents: 3 });
    assert.equal(calls.length, 3);
  });
});
