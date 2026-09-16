import type { Agent } from '@/types';

export type AgentCli = Agent['cli'];

export interface CreateAgentInput {
  name: string;
  cli: AgentCli;
  cwd?: string;
  role?: string;
  flags?: Agent['flags'];
}

export type UpdateAgentInput = Partial<Agent>;

export interface AgentLifecycleInput {
  projectId: string;
  agentId: string;
}

export interface AgentLifecycleResult {
  status: string;
}
