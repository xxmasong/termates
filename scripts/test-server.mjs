// Bundles tests/**/*.test.ts with esbuild and runs them with node:test.
// Usage: npm run test:server [-- <filter>]
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testsDir = path.join(root, 'tests');
const filter = process.argv[2] ?? '';

const collect = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collect(full);
    return entry.name.endsWith('.test.ts') && full.includes(filter) ? [full] : [];
  });

const entries = collect(testsDir);
if (entries.length === 0) {
  console.error('No tests matched.');
  process.exit(1);
}

// Emitted inside the repo so bare imports resolve from node_modules (ESM
// ignores NODE_PATH). dist/ is gitignored.
mkdirSync(path.join(root, 'dist'), { recursive: true });
const outdir = mkdtempSync(path.join(root, 'dist', '.tests-'));
try {
  await build({
    entryPoints: entries,
    outdir,
    outbase: testsDir,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    packages: 'external',
    outExtension: { '.js': '.mjs' },
    logLevel: 'warning',
  });
  const outputs = entries.map((file) =>
    path.join(outdir, path.relative(testsDir, file).replace(/\.ts$/, '.mjs')),
  );
  const result = spawnSync(process.execPath, ['--test', ...outputs], {
    stdio: 'inherit',
    cwd: root,
  });
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(outdir, { recursive: true, force: true });
}
