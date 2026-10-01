/**
 * usage.ts — how much of their plan a user is using, read from their own
 * workspace's API (the control plane keeps no copy of projects or agents).
 */

import type { WorkspaceRow } from './db.js';

const WORKSPACE_TIMEOUT_MS = 5_000;

export interface PlanUsage {
  projects: number;
  agents: number;
}

type Fetcher = (url: string) => Promise<unknown>;

const fetchJson: Fetcher = async (url) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(WORKSPACE_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
};

/** Count projects and agents (all projects, running or stopped) in a workspace. */
export async function workspaceUsage(
  ws: Pick<WorkspaceRow, 'port_base'>,
  get: Fetcher = fetchJson,
): Promise<PlanUsage> {
  const base = `http://127.0.0.1:${ws.port_base}/api`;
  const projects = (await get(`${base}/projects`)) as Array<{ id: string }>;
  const agentLists = await Promise.all(
    projects.map(
      (project) =>
        get(`${base}/projects/${encodeURIComponent(project.id)}/agents`) as Promise<unknown[]>,
    ),
  );
  return {
    projects: projects.length,
    agents: agentLists.reduce((sum, agents) => sum + agents.length, 0),
  };
}
