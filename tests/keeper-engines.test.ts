import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';

import { KEEPER_ENGINE_SPECS, toolLabel, type EngineContext } from '../src/daemon/keeper-engines.js';
import { isValidModel } from '../src/daemon/keeper-limits.js';

const brainDir = fs.mkdtempSync(path.join(os.tmpdir(), 'termates-keeper-'));
const ctx = (over: Partial<EngineContext> = {}): EngineContext => ({
  brainDir,
  persona: '# Keeper',
  mcpCommand: '/usr/bin/node',
  mcpArgs: ['/x/keeper-mcp-server.js', '--daemon', 'http://127.0.0.1:3210'],
  model: '',
  sessionId: null,
  prompt: 'hello',
  ...over,
});

after(() => fs.rmSync(brainDir, { recursive: true, force: true }));

describe('toolLabel', () => {
  it('names MCP tools server/tool for every engine', () => {
    assert.equal(toolLabel('mcp__keeper__ask_agent'), 'keeper/ask_agent');
    assert.equal(toolLabel('mcp_keeper_list_projects'), 'keeper/list_projects');
    assert.equal(toolLabel('Read'), 'Read');
  });
});

describe('isValidModel', () => {
  it('accepts plain model ids and rejects anything flag- or shell-like', () => {
    for (const ok of ['', 'opus', 'opus[1m]', 'gpt-5.6-terra', 'models/gemini-3.8-flash']) {
      assert.ok(isValidModel(ok), ok);
    }
    for (const bad of ['--dangerously-skip-permissions', 'a b', 'x;rm -rf /', '$(id)', 'a'.repeat(101)]) {
      assert.ok(!isValidModel(bad), bad);
    }
  });
});

describe('codex engine', () => {
  it('runs read-only with only the keeper tools pre-approved, never bypassing', () => {
    const turn = KEEPER_ENGINE_SPECS.codex.prepare(ctx({ model: 'gpt-5.6' }));
    assert.ok(!turn.args.some((arg) => arg.includes('dangerously')));
    assert.deepEqual(turn.args.slice(0, 3), ['exec', '--cd', brainDir]);
    const config = fs.readFileSync(path.join(brainDir, 'codex-home', 'config.toml'), 'utf-8');
    assert.match(config, /sandbox_mode = "read-only"/);
    assert.match(config, /approval_policy = "never"/);
    assert.match(config, /\[features\][\s\S]*shell_tool = false[\s\S]*unified_exec = false/);
    assert.match(config, /\[mcp_servers\.keeper\][\s\S]*default_tools_approval_mode = "approve"/);
    assert.match(config, /model = "gpt-5.6"/);
    assert.equal(turn.stdin, 'hello');
  });

  it('resumes the stored thread', () => {
    const turn = KEEPER_ENGINE_SPECS.codex.prepare(ctx({ sessionId: 'thread-1' }));
    assert.deepEqual(turn.args.slice(0, 3), ['exec', 'resume', 'thread-1']);
  });

  it('parses thread ids, answers and tool calls', () => {
    const parser = KEEPER_ENGINE_SPECS.codex.parser();
    assert.equal(parser.line('{"type":"thread.started","thread_id":"t9"}').sessionId, 't9');
    assert.deepEqual(
      parser.line('{"type":"item.completed","item":{"type":"agent_message","text":" hi "}}').messages,
      [{ role: 'assistant', text: 'hi' }],
    );
    const [tool] = parser.line(
      '{"type":"item.completed","item":{"type":"mcp_tool_call","server":"keeper","tool":"list_projects","arguments":{}}}',
    ).messages;
    assert.equal(tool.tool, 'keeper/list_projects');
    assert.deepEqual(parser.line('not json').messages, []);
  });
});

describe('claude engine', () => {
  it('disables built-in tools and allows only the keeper MCP server', () => {
    const turn = KEEPER_ENGINE_SPECS.claude.prepare(ctx({ model: 'haiku' }));
    const at = (flag: string) => turn.args[turn.args.indexOf(flag) + 1];
    assert.equal(at('--tools'), '');
    assert.equal(at('--allowedTools'), 'mcp__keeper__*');
    assert.ok(turn.args.includes('--strict-mcp-config'));
    assert.equal(at('--model'), 'haiku');
    assert.equal(at('--session-id'), turn.sessionId);
    assert.ok(!turn.args.some((arg) => arg.includes('skip-permissions')));
    const mcp = JSON.parse(fs.readFileSync(at('--mcp-config'), 'utf-8'));
    assert.deepEqual(Object.keys(mcp.mcpServers), ['keeper']);
  });

  it('resumes an existing session instead of starting one', () => {
    const turn = KEEPER_ENGINE_SPECS.claude.prepare(ctx({ sessionId: 's-1' }));
    assert.equal(turn.args[turn.args.indexOf('--resume') + 1], 's-1');
    assert.ok(!turn.args.includes('--session-id'));
  });

  it('parses text, tool use, thinking and errors', () => {
    const parser = KEEPER_ENGINE_SPECS.claude.parser();
    assert.equal(parser.line('{"type":"system","subtype":"init","session_id":"s-2"}').sessionId, 's-2');
    const { messages } = parser.line(
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'thinking', thinking: 'plan' },
            { type: 'text', text: 'Checking.' },
            { type: 'tool_use', name: 'mcp__keeper__list_projects', input: {} },
          ],
        },
      }),
    );
    assert.deepEqual(
      messages.map((m) => [m.role, m.tool ?? m.text]),
      [
        ['reasoning', 'plan'],
        ['assistant', 'Checking.'],
        ['tool', 'keeper/list_projects'],
      ],
    );
    assert.deepEqual(parser.line('{"type":"result","is_error":true,"result":"Not logged in"}').messages, [
      { role: 'error', text: 'Not logged in' },
    ]);
  });
});

describe('gemini engine', () => {
  it('disables built-in tools, trusts only the keeper server and passes the prompt as an argument', () => {
    const turn = KEEPER_ENGINE_SPECS.gemini.prepare(ctx());
    const at = (flag: string) => turn.args[turn.args.indexOf(flag) + 1];
    assert.equal(at('--allowed-mcp-server-names'), 'keeper');
    assert.equal(at('-p'), 'hello');
    assert.equal(at('--session-id'), turn.sessionId);
    assert.ok(!turn.args.includes('yolo'));
    const settings = JSON.parse(fs.readFileSync(path.join(turn.cwd, '.gemini', 'settings.json'), 'utf-8'));
    assert.equal(settings.mcpServers.keeper.trust, true);
    assert.deepEqual(settings.tools, { core: [] });
    assert.equal(fs.readFileSync(path.join(turn.cwd, 'GEMINI.md'), 'utf-8'), '# Keeper');
  });

  it('joins streamed deltas into one answer, split around tool calls', () => {
    const parser = KEEPER_ENGINE_SPECS.gemini.parser();
    assert.deepEqual(parser.line('{"type":"message","role":"assistant","content":"Look","delta":true}').messages, []);
    const atTool = parser.line('{"type":"tool_use","tool_name":"mcp_keeper_read_wiki","parameters":{"p":1}}');
    assert.deepEqual(
      atTool.messages.map((m) => m.tool ?? m.text),
      ['Look', 'keeper/read_wiki'],
    );
    parser.line('{"type":"message","role":"assistant","content":"Done ","delta":true}');
    parser.line('{"type":"message","role":"assistant","content":"now.","delta":true}');
    assert.deepEqual(parser.line('{"type":"result","status":"success"}').messages, [
      { role: 'assistant', text: 'Done now.' },
    ]);
    parser.line('{"type":"message","role":"assistant","content":"tail","delta":true}');
    assert.deepEqual(parser.end(), [{ role: 'assistant', text: 'tail' }]);
  });

  it('reports a failed result', () => {
    const parser = KEEPER_ENGINE_SPECS.gemini.parser();
    assert.deepEqual(parser.line('{"type":"result","status":"error","error":{"message":"quota"}}').messages, [
      { role: 'error', text: 'quota' },
    ]);
  });
});

describe('syncNewerAuth', () => {
  it('copies a Codex login only when it was refreshed more recently', async () => {
    const { syncNewerAuth } = await import('../src/daemon/keeper-engines.js');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'termates-auth-'));
    const user = path.join(dir, 'user.json');
    const keeper = path.join(dir, 'keeper.json');
    const auth = (at: string, token: string) => JSON.stringify({ last_refresh: at, tokens: { refresh_token: token } });
    fs.writeFileSync(user, auth('2026-10-01T00:00:00Z', 'old'));
    syncNewerAuth(user, keeper);
    assert.match(fs.readFileSync(keeper, 'utf-8'), /"old"/);
    assert.equal(fs.statSync(keeper).mode & 0o777, 0o600);

    // The Keeper's codex refreshed: the rotated token goes back to the user…
    fs.writeFileSync(keeper, auth('2026-10-02T00:00:00Z', 'rotated'));
    syncNewerAuth(keeper, user);
    assert.match(fs.readFileSync(user, 'utf-8'), /"rotated"/);
    // …and an older copy never overwrites a newer login.
    fs.writeFileSync(keeper, auth('2026-09-01T00:00:00Z', 'stale'));
    syncNewerAuth(keeper, user);
    assert.match(fs.readFileSync(user, 'utf-8'), /"rotated"/);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
