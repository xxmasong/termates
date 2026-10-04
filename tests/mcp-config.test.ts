import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';

import { cleanStaleCodexMcp, mcpServerKeyForCodex } from '../src/mcp-config.js';

describe('cleanStaleCodexMcp', () => {
  const saved = process.env.HOME;
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'termates-mcp-'));
  const configPath = path.join(home, '.codex', 'config.toml');

  after(() => {
    process.env.HOME = saved;
    fs.rmSync(home, { recursive: true, force: true });
  });

  it('drops pre-rename termhive_ sections and keeps live and user ones', () => {
    process.env.HOME = home;
    const live = 'aaaaaaaa-0000-0000-0000-000000000000';
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      [
        'model = "gpt-5"',
        '',
        '[mcp_servers.mine]',
        'command = "mine"',
        '',
        '# Termhive MCP servers — managed by Termhive, do not edit this section manually',
        '[mcp_servers.termhive_aaaaaaaa]',
        'command = "node"',
        '',
        '# Termates MCP servers — managed by Termates, do not edit this section manually',
        `[mcp_servers.${mcpServerKeyForCodex(live)}]`,
        'command = "node"',
        '',
        '[mcp_servers.termates_bbbbbbbb]',
        'command = "node"',
        '',
      ].join('\n'),
    );

    assert.equal(cleanStaleCodexMcp([live]), 2);
    const out = fs.readFileSync(configPath, 'utf-8');
    assert.ok(out.includes('[mcp_servers.mine]'));
    assert.ok(out.includes('[mcp_servers.termates_aaaaaaaa]'));
    assert.ok(out.includes('# Termates MCP servers'));
    assert.ok(!out.includes('termhive'));
    assert.ok(!out.includes('Termhive'));
    assert.ok(!out.includes('termates_bbbbbbbb'));
  });
});
