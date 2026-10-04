// Runs a workspace: the daemon (owns every agent PTY) and the web server.
// A child that dies on its own is restarted after a short delay, so a crashed
// web server no longer leaves the unit "active" with nothing on its port. On
// SIGTERM/SIGINT/SIGHUP the signal is passed on and nothing is restarted, so
// `systemctl stop` finishes promptly.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RESTART_DELAY_MS = 2000;
const CHILDREN = [
  { name: 'daemon', args: ['dist/daemon/daemon.js'] },
  { name: 'web', args: ['dist/server.js'] },
];

let stopping = false;
const running = new Map();

const prefixed = (name, stream, out) => {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk;
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      out.write(`[${name}] ${buffer.slice(0, nl)}\n`);
      buffer = buffer.slice(nl + 1);
    }
  });
  stream.on('end', () => buffer && out.write(`[${name}] ${buffer}\n`));
};

function start({ name, args }) {
  const child = spawn(process.execPath, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  running.set(name, child);
  prefixed(name, child.stdout, process.stdout);
  prefixed(name, child.stderr, process.stderr);
  child.on('exit', (code, signal) => {
    running.delete(name);
    console.log(`[${name}] exited with ${signal ?? code}`);
    if (stopping) {
      if (running.size === 0) process.exit(0);
      return;
    }
    setTimeout(() => {
      if (!stopping) {
        console.log(`[${name}] restarting`);
        start({ name, args });
      }
    }, RESTART_DELAY_MS);
  });
}

for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
  process.on(signal, () => {
    stopping = true;
    if (running.size === 0) process.exit(0);
    for (const child of running.values()) child.kill(signal);
  });
}

for (const child of CHILDREN) start(child);
