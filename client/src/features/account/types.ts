import type { PlanId } from '@/constants';

export type WorkspaceState = 'provisioning' | 'running' | 'stopped' | 'error';

/** GET /auth/me */
export interface Me {
  user: { email: string; name: string | null; avatarUrl: string | null; role: 'user' | 'admin' };
  plan: { id: PlanId; maxProjects: number | null; maxAgents: number };
  workspace: { state: WorkspaceState };
}

export type WorkspaceGateStatus =
  'loading' | 'unauthenticated' | 'provisioning' | 'error' | 'ready';

/** The workspace's 403 {code:'PLAN_LIMIT'} body. */
export interface PlanLimit {
  kind: 'project' | 'agent';
  limit: number;
  used: number;
}
