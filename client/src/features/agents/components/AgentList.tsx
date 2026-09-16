import type { Agent } from '@/types';

import { Button, EmptyState, Spinner } from '@/components';

import { AgentCard } from './AgentCard';

export interface AgentListProps {
  agents: Agent[];
  previews?: Record<string, string>;
  selectedAgentId: string | null;
  loading?: boolean;
  error?: string | null;
  lifecycleBusy?: boolean;
  onCreateAgent: () => void;
  onSelectAgent: (agentId: string) => void;
  onStartAgent: (agent: Agent) => void;
  onStopAgent: (agent: Agent) => void;
  onRestartAgent: (agent: Agent) => void;
  onDeleteAgent: (agent: Agent) => void;
}

export const AgentList: React.FC<AgentListProps> = ({
  agents,
  previews,
  selectedAgentId,
  loading = false,
  error,
  lifecycleBusy = false,
  onCreateAgent,
  onSelectAgent,
  onStartAgent,
  onStopAgent,
  onRestartAgent,
  onDeleteAgent,
}) => (
  <section className="agent-list">
    <header className="feature-section-header">
      <span>Agents</span>
      <Button icon="plus" onClick={onCreateAgent} size="sm" variant="ghost">
        Agent
      </Button>
    </header>
    {loading ? (
      <div className="feature-loading">
        <Spinner />
      </div>
    ) : null}
    {error ? <div className="feature-error">{error}</div> : null}
    {!loading && agents.length === 0 ? (
      <EmptyState
        action={
          <Button icon="plus" onClick={onCreateAgent} size="sm" variant="primary">
            New agent
          </Button>
        }
        title="No agents"
      />
    ) : null}
    <div className="agent-list__items">
      {agents.map((agent) => (
        <AgentCard
          agent={agent}
          key={agent.id}
          lifecycleBusy={lifecycleBusy}
          onDelete={onDeleteAgent}
          onRestart={onRestartAgent}
          onSelect={onSelectAgent}
          onStart={onStartAgent}
          onStop={onStopAgent}
          preview={previews?.[agent.id]}
          selected={agent.id === selectedAgentId}
        />
      ))}
    </div>
  </section>
);
