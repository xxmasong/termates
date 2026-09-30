import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/server.ts',
    'src/mcp-server.ts',
    'src/hive-mcp-server.ts',
    'src/daemon/daemon.ts',
    'src/cloud/server.ts',
    'src/cloud/admin-cli.ts',
  ],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  // Keep the Vite client build: build:server must not wipe dist/client.
  clean: ['!client', '!client/**'],
  sourcemap: true,
  external: ['node-pty'],
  // Keep `node:` specifiers: node:sqlite only exists with the prefix.
  removeNodeProtocol: false,
});
