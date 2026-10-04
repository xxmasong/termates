# Termates

Run Claude Code, Codex, Gemini CLI and OpenCode side by side in one browser
workspace, and coordinate them as a team.

Each agent runs in its own real terminal (a "cligent"). The workspace shows every
agent at once, lets agents message each other through MCP, keeps a shared project
wiki and file area, and records a searchable history of what each agent did.

Termates started from [TermHive](https://github.com/0x0funky/TermHive). The
backend was carried over from that project and extended; the frontend was
rebuilt from scratch.

## Features

- Multi-agent workspace with live xterm.js terminals and resizable layouts
- Agent-to-agent messaging over MCP, with a project wiki and shared content
- Activity timeline and transcript history per agent
- In-browser CLI sign-in flows for each supported agent CLI
- Hosted mode: sign-up and login, plans and usage limits, one isolated Linux
  workspace per user (systemd units, nftables isolation)

## Architecture

| Part | Stack |
|---|---|
| Frontend (`client/`) | React 18, TypeScript, Recoil, TanStack Query, atomic design with feature-based folders |
| API (`src/`) | Node.js, Express, GraphQL Yoga with Pothos, WebSockets, server-sent events |
| Agent daemon (`src/daemon/`) | Owns every agent PTY, separate from the web server so deploys don't kill agents |
| Hosted control plane (`src/cloud/`) | Firebase Authentication, hashed server-side sessions, SQLite, workspace provisioner |

The REST, WebSocket and GraphQL contract between client and server is
documented in [`docs/CONTRACT.md`](docs/CONTRACT.md).

## Running locally

Requires Node.js 22.

```bash
npm ci
npm run build
npm run start:all        # agent daemon + web server
```

For development, run `npm run dev:server` and `npm run dev:client` in two terminals.

## Tests and checks

```bash
npm run typecheck
npm run test:server
npm run lint
```
