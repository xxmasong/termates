# TermHive v2

Multi-CLI coding agent orchestrator. Frontend rebuilt from scratch on
atomic design + feature-based architecture.

- **Backend** (`src/`) — carried over unchanged from TermHive v1.
- **Frontend** (`client/`) — React 18 + TypeScript, Recoil, TanStack Query.

See `docs/PLAN.md` for architecture and `docs/CONTRACT.md` for the frozen
backend API/WebSocket contract.

## Runtime
- Host: SG CT102 `sg1-termhive2` (10.10.1.12)
- Web server serves the client, `/api`, and `/ws`
- A separate daemon owns all agent PTYs on `127.0.0.1:3210`
