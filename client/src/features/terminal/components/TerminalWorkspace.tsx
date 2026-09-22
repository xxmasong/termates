import { useMemo } from 'react';

import type { Agent } from '@/types';

import { EmptyState, GridLayout } from '@/components';
import { STORAGE_KEYS } from '@/constants';

import { useTerminalLayoutMode } from '../hooks';
import { AgentPane } from './AgentPane';

export interface TerminalWorkspaceProps {
  agents: Agent[];
  selectedAgentId: string | null;
  onDeleteAgent: (agent: Agent) => void;
  onRestartAgent: (agent: Agent) => void;
  onSelectAgent: (agentId: string) => void;
  onStartAgent: (agent: Agent) => void;
  onStopAgent: (agent: Agent) => void;
}

export const TerminalWorkspace: React.FC<TerminalWorkspaceProps> = ({
  agents,
  selectedAgentId,
  onDeleteAgent,
  onRestartAgent,
  onSelectAgent,
  onStartAgent,
  onStopAgent,
}) => {
  const [layoutMode] = useTerminalLayoutMode();

  const panes = useMemo(
    () =>
      agents.map((agent) => ({
        children: (
          <AgentPane
            agent={agent}
            focused={agent.id === selectedAgentId}
            onDelete={onDeleteAgent}
            onFocus={onSelectAgent}
            onRestart={onRestartAgent}
            onStart={onStartAgent}
            onStop={onStopAgent}
          />
        ),
        id: agent.id,
      })),
    [
      agents,
      onDeleteAgent,
      onRestartAgent,
      onSelectAgent,
      onStartAgent,
      onStopAgent,
      selectedAgentId,
    ],
  );

  if (agents.length === 0) {
    return <EmptyState title="No agents yet" />;
  }

  return (
    <section className="terminal-workspace">
      <GridLayout
        emptyTitle="No terminals"
        focusedId={selectedAgentId}
        mode={layoutMode}
        onFocus={onSelectAgent}
        panes={panes}
        storageKeyPrefix={STORAGE_KEYS.LAYOUT_MODE}
      />
    </section>
  );
};
