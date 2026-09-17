import { useCallback, useMemo } from 'react';

import type { Agent } from '@/types';

import { Button, EmptyState, GridLayout, Toolbar, ToolbarGroup, type GridLayoutMode } from '@/components';
import { STORAGE_KEYS } from '@/constants';

import { TERMINAL_LAYOUT_OPTIONS } from '../constants';
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
  const [layoutMode, setLayoutMode] = useTerminalLayoutMode();

  const selectLayoutMode = useCallback(
    (mode: GridLayoutMode) => {
      setLayoutMode(mode);
    },
    [setLayoutMode],
  );

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
      <header className="terminal-workspace__bar">
        <Toolbar align="between">
          <ToolbarGroup>
            <span className="terminal-workspace__title">Terminals</span>
          </ToolbarGroup>
          <ToolbarGroup>
            {TERMINAL_LAYOUT_OPTIONS.map((option) => (
              <Button
                aria-pressed={layoutMode === option.value}
                icon={option.icon}
                iconOnly
                key={option.value}
                onClick={() => selectLayoutMode(option.value)}
                size="sm"
                title={option.label}
                variant={layoutMode === option.value ? 'primary' : 'ghost'}
              />
            ))}
          </ToolbarGroup>
        </Toolbar>
      </header>
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
