import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // src/server.ts defaults to PORT 3200.
      '/api': 'http://localhost:3200',
      '/ws': {
        target: 'http://localhost:3200',
        ws: true,
      },
    },
  },
  build: {
    // src/server.ts resolves the client as path.join(__dirname, 'client'), and
    // tsup bundles the server to dist/server.js — so it serves dist/client.
    outDir: fileURLToPath(new URL('../dist/client', import.meta.url)),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('/node_modules/@xterm/')) {
            return 'xterm';
          }

          if (id.includes('/node_modules/')) {
            return 'vendor';
          }

          return undefined;
        },
      },
    },
  },
});
