#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// This exists because TermHive's hard-coded CLI option lists have drifted from
// reality multiple times. CLI --help output also understates some real accepted
// values, so the values are verified against the CLIs/APIs themselves.

const CONSTANTS_PATH = path.resolve('client/src/features/agents/constants.ts');
const GEMINI_ENV_PATH = '/etc/termhive2/gemini.env';
const CHECK_TIMEOUT_MS = 40_000;
const CONCURRENCY = 3;
const OUTPUT_LIMIT = 16_000;
const includeCodex = process.argv.includes('--include-codex');

const STATUS = {
  FAIL: 'FAIL',
  GATED: 'GATED',
  PASS: 'PASS',
  SKIPPED: 'SKIPPED',
};

const TARGET_CLIS = ['claude', 'codex', 'gemini'];
const OPTION_TABLES = [
  { category: 'models', name: 'AGENT_MODEL_OPTIONS' },
  { category: 'efforts', name: 'AGENT_EFFORT_OPTIONS' },
  { category: 'thinking', name: 'AGENT_THINKING_OPTIONS' },
  { category: 'permission modes', name: 'AGENT_PERMISSION_MODES' },
  { category: 'autocompact', name: 'AGENT_AUTOCOMPACT_OPTIONS' },
];

const cliEnv = {
  ...process.env,
  PATH: pathWithUsrLocalBin(process.env.PATH),
};

if (process.argv.includes('--help')) {
  console.log(`Usage: npm run verify:cli-options -- [--include-codex]

Verifies option arrays exported from client/src/features/agents/constants.ts.
Codex checks are skipped by default because invoking codex consumes quota.`);
  process.exit(0);
}

const source = await readFile(CONSTANTS_PATH, 'utf8');
const optionTables = extractOptionTables(source, OPTION_TABLES.map((table) => table.name));
const extractedValueCount = countExtractedValues(optionTables);

if (extractedValueCount === 0) {
  console.error(`ERROR: Extracted zero CLI option values from ${path.relative(process.cwd(), CONSTANTS_PATH)}.
Expected string arrays in ${OPTION_TABLES.map((table) => table.name).join(', ')} keyed by claude/codex/gemini.
This is a hard failure because a 100% skipped run usually means the parser or constants shape drifted.`);
  process.exit(1);
}

console.log(`Verifying CLI options from ${path.relative(process.cwd(), CONSTANTS_PATH)}`);
if (!includeCodex) {
  console.log('Codex checks are skipped by default because invoking codex consumes quota.');
}
console.log('');

const geminiKeyPromise = readGeminiApiKey();
const checkerBySource = new Map([
  ['AGENT_MODEL_OPTIONS:claude', { checker: (value) => checkClaude(['--model', value, '-p', 'hi']) }],
  ['AGENT_EFFORT_OPTIONS:claude', { checker: (value) => checkClaude(['--effort', value, '-p', 'hi']) }],
  ['AGENT_THINKING_OPTIONS:claude', { checker: (value) => checkClaude(['--thinking', value, '-p', 'hi']) }],
  ['AGENT_PERMISSION_MODES:claude', { checker: (value) => checkClaude(['--permission-mode', value, '-p', 'hi']) }],
  ['AGENT_MODEL_OPTIONS:gemini', { checker: (value) => checkGeminiModel(value, geminiKeyPromise) }],
  ['AGENT_MODEL_OPTIONS:codex', { checker: (value) => checkCodexModel(value), quotaGated: true }],
  ['AGENT_EFFORT_OPTIONS:codex', { checker: (value) => checkCodexEffort(value), quotaGated: true }],
]);

const definitions = OPTION_TABLES.flatMap((table) =>
  TARGET_CLIS.map((cli) => ({
    ...table,
    cli,
    source: `${table.name}.${cli}`,
    title: `${labelCli(cli)} ${table.category}`,
    ...(checkerBySource.get(`${table.name}:${cli}`) ?? {}),
  })),
);

const allResults = [];

for (const definition of definitions) {
  const values = optionTables.get(definition.name)?.get(definition.cli);
  let results;

  if (!optionTables.has(definition.name)) {
    results = [
      {
        category: definition.category,
        cli: definition.cli,
        detail: `${definition.name} was not found in constants.ts`,
        source: definition.source,
        status: STATUS.SKIPPED,
        value: '(none)',
      },
    ];
  } else if (!values) {
    results = [
      {
        category: definition.category,
        cli: definition.cli,
        detail: `${definition.cli} key was not found`,
        source: definition.source,
        status: STATUS.SKIPPED,
        value: '(none)',
      },
    ];
  } else if (values.length === 0) {
    results = [
      {
        category: definition.category,
        cli: definition.cli,
        detail: 'not applicable',
        source: definition.source,
        status: STATUS.SKIPPED,
        value: '(none)',
      },
    ];
  } else if (!definition.checker) {
    results = values.map((value) => ({
      category: definition.category,
      cli: definition.cli,
      detail: 'No verifier configured for this control',
      source: definition.source,
      status: STATUS.SKIPPED,
      value,
    }));
  } else if (definition.quotaGated && !includeCodex) {
    results = values.map((value) => ({
      category: definition.category,
      cli: definition.cli,
      detail: 'Pass --include-codex to run quota-consuming codex checks',
      source: definition.source,
      status: STATUS.SKIPPED,
      value,
    }));
  } else {
    results = await mapLimit(values, CONCURRENCY, async (value) => ({
      ...(await definition.checker(value)),
      category: definition.category,
      cli: definition.cli,
      source: definition.source,
      value,
    }));
  }

  allResults.push(...results);
  printTable(definition.title, results);
  console.log('');
}

printSummary(allResults);
process.exitCode = allResults.some((result) => result.status === STATUS.FAIL) ? 1 : 0;

function pathWithUsrLocalBin(currentPath) {
  const parts = (currentPath ?? '').split(':').filter(Boolean);
  return parts.includes('/usr/local/bin') ? parts.join(':') : ['/usr/local/bin', ...parts].join(':');
}

function extractOptionTables(text, tableNames) {
  const tables = new Map();

  for (const tableName of tableNames) {
    const match = new RegExp(`export\\s+const\\s+${tableName}\\b`).exec(text);
    if (!match) continue;

    const equalsIndex = text.indexOf('=', match.index);
    const objectStart = text.indexOf('{', equalsIndex);
    if (equalsIndex === -1 || objectStart === -1) continue;

    const objectEnd = findMatchingDelimiter(text, objectStart, '{', '}');
    if (objectEnd === -1) continue;

    tables.set(tableName, extractCliArrays(text.slice(objectStart + 1, objectEnd)));
  }

  return tables;
}

function extractCliArrays(tableBody) {
  const arrays = new Map();

  for (const cli of TARGET_CLIS) {
    const match = new RegExp(`(?:^|[,{\\s])(?:${cli}|'${cli}'|"${cli}")\\s*:\\s*\\[`, 'm').exec(tableBody);
    if (!match) continue;

    const arrayStart = tableBody.indexOf('[', match.index);
    const arrayEnd = findMatchingDelimiter(tableBody, arrayStart, '[', ']');
    if (arrayStart === -1 || arrayEnd === -1) continue;

    arrays.set(cli, extractStringValues(tableBody.slice(arrayStart + 1, arrayEnd)));
  }

  return arrays;
}

function extractStringValues(text) {
  const matches = [...text.matchAll(/'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"|`((?:\\.|[^`\\])*)`/g)];
  return [...new Set(matches.map((match) => decodeStringLiteral(match[1] ?? match[2] ?? match[3] ?? '')))];
}

function decodeStringLiteral(value) {
  return value.replace(/\\(['"`\\])/g, '$1');
}

function findMatchingDelimiter(text, start, open, close) {
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = '';
      }
      continue;
    }

    if (char === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      quote = char;
      continue;
    }

    if (char === open) depth += 1;
    if (char === close) depth -= 1;
    if (depth === 0) return index;
  }

  return -1;
}

function countExtractedValues(tables) {
  let count = 0;

  for (const table of tables.values()) {
    for (const values of table.values()) {
      count += values.length;
    }
  }

  return count;
}

function labelCli(cli) {
  return cli[0].toUpperCase() + cli.slice(1);
}

async function checkClaude(args) {
  const result = await runProcess('claude', args, CHECK_TIMEOUT_MS);
  const output = result.output;

  if (/requires usage credits/i.test(output)) {
    return { detail: 'requires usage credits', status: STATUS.GATED };
  }

  if (result.timedOut) {
    return { detail: `Timed out after ${CHECK_TIMEOUT_MS / 1000}s`, status: STATUS.FAIL };
  }

  if (/invalid|Allowed choices/i.test(output)) {
    return { detail: summarizeOutput(output), status: STATUS.FAIL };
  }

  if (result.code === 0) {
    return { detail: 'exit 0', status: STATUS.PASS };
  }

  return { detail: `exit ${result.code ?? result.signal ?? 'unknown'}: ${summarizeOutput(output || result.error)}`, status: STATUS.FAIL };
}

async function checkCodexModel(value) {
  return checkCodex(['exec', '--model', value, ...codexSafeArgs(), 'hi']);
}

async function checkCodexEffort(value) {
  return checkCodex(['exec', '-c', `model_reasoning_effort="${value}"`, ...codexSafeArgs(), 'hi']);
}

async function checkCodex(args) {
  const result = await runProcess('codex', args, CHECK_TIMEOUT_MS);
  const output = result.output;

  if (result.timedOut) {
    return { detail: `Timed out after ${CHECK_TIMEOUT_MS / 1000}s`, status: STATUS.FAIL };
  }

  if (/invalid|unknown|unsupported|Allowed choices/i.test(output)) {
    return { detail: summarizeOutput(output), status: STATUS.FAIL };
  }

  if (result.code === 0) {
    return { detail: 'exit 0', status: STATUS.PASS };
  }

  return { detail: `exit ${result.code ?? result.signal ?? 'unknown'}: ${summarizeOutput(output || result.error)}`, status: STATUS.FAIL };
}

function codexSafeArgs() {
  return [
    '--ask-for-approval',
    'never',
    '--sandbox',
    'read-only',
    '--ephemeral',
    '--ignore-rules',
    '--skip-git-repo-check',
  ];
}

async function checkGeminiModel(value, keyPromise) {
  const apiKey = await keyPromise;

  if (!apiKey) {
    return { detail: `No GEMINI_API_KEY found in ${GEMINI_ENV_PATH}`, status: STATUS.SKIPPED };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(value)}?key=${encodeURIComponent(apiKey)}`,
      { signal: controller.signal },
    );

    if (response.status === 200) {
      return { detail: 'HTTP 200', status: STATUS.PASS };
    }

    const text = await response.text();
    return { detail: `HTTP ${response.status}: ${summarizeOutput(text)}`, status: STATUS.FAIL };
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { detail: `Timed out after ${CHECK_TIMEOUT_MS / 1000}s`, status: STATUS.FAIL };
    }
    return { detail: summarizeOutput(error?.message ?? String(error)), status: STATUS.FAIL };
  } finally {
    clearTimeout(timer);
  }
}

async function readGeminiApiKey() {
  try {
    const content = await readFile(GEMINI_ENV_PATH, 'utf8');
    const match = content.match(/^\s*GEMINI_API_KEY\s*=\s*(.+?)\s*$/m);
    if (!match) return null;

    return match[1].trim().replace(/^['"]|['"]$/g, '');
  } catch {
    return null;
  }
}

function runProcess(command, args, timeoutMs) {
  return new Promise((resolve) => {
    let output = '';
    let timedOut = false;
    let settled = false;
    let killTimer;

    // No shell is used, so values like sonnet[1m] remain one argv element and
    // cannot be glob-expanded by the shell.
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: cliEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const append = (chunk) => {
      if (output.length < OUTPUT_LIMIT) {
        output += chunk.toString('utf8').slice(0, OUTPUT_LIMIT - output.length);
      }
    };

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(killTimer);
      resolve({ ...result, output, timedOut });
    };

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      killTimer = setTimeout(() => child.kill('SIGKILL'), 1_000);
    }, timeoutMs);

    child.stdout.on('data', append);
    child.stderr.on('data', append);
    child.on('error', (error) => finish({ code: null, error: error.message, signal: null }));
    child.on('close', (code, signal) => finish({ code, error: '', signal }));
  });
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function next() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return results;
}

function summarizeOutput(value) {
  const compact = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!compact) return '(no output)';
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
}

function printTable(title, results) {
  const rows = results.map((result) => ({
    Detail: result.detail,
    Source: result.source,
    Status: result.status,
    Value: result.value,
  }));
  const columns = ['Source', 'Value', 'Status', 'Detail'];
  const widths = Object.fromEntries(
    columns.map((column) => [column, Math.max(column.length, ...rows.map((row) => String(row[column]).length))]),
  );

  console.log(title);
  console.log(columns.map((column) => pad(rowLabel(column), widths[column])).join('  '));
  console.log(columns.map((column) => '-'.repeat(widths[column])).join('  '));
  for (const row of rows) {
    console.log(columns.map((column) => pad(row[column], widths[column])).join('  '));
  }
}

function rowLabel(value) {
  return value;
}

function pad(value, width) {
  return String(value).padEnd(width, ' ');
}

function printSummary(results) {
  const byCli = new Map();

  for (const result of results) {
    const counts = byCli.get(result.cli) ?? {
      [STATUS.FAIL]: 0,
      [STATUS.GATED]: 0,
      [STATUS.PASS]: 0,
      [STATUS.SKIPPED]: 0,
    };
    counts[result.status] += 1;
    byCli.set(result.cli, counts);
  }

  const rows = [...byCli.entries()].map(([cli, counts]) => ({
    CLI: cli,
    FAIL: counts[STATUS.FAIL],
    GATED: counts[STATUS.GATED],
    PASS: counts[STATUS.PASS],
    SKIPPED: counts[STATUS.SKIPPED],
  }));
  const columns = ['CLI', 'PASS', 'GATED', 'FAIL', 'SKIPPED'];
  const widths = Object.fromEntries(
    columns.map((column) => [column, Math.max(column.length, ...rows.map((row) => String(row[column]).length))]),
  );

  console.log('Summary');
  console.log(columns.map((column) => pad(column, widths[column])).join('  '));
  console.log(columns.map((column) => '-'.repeat(widths[column])).join('  '));
  for (const row of rows) {
    console.log(columns.map((column) => pad(row[column], widths[column])).join('  '));
  }
}
