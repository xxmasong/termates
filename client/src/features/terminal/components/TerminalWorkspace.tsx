import { useCallback, useMemo } from 'react';

import type { Agent } from '@/types';

import { Button, EmptyState, GridLayout, Toolbar, ToolbarGroup, type GridLayoutMode } from '@/components';
import { STORAGE_KEYS } from '@/constants';

import { TERMINAL_LAYOUT_OPTIONS } from '../constants';
import { useTerminalLayoutMode } from '../hooks';
import { AgentTerminal } from './AgentTerminal';

export interface TerminalWorkspaceProps {
  agents: Agent[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
}

export const TerminalWorkspace: React.FC<TerminalWorkspaceProps> = ({
  agents,
  selectedAgentId,
  onSelectAgent,
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
          <AgentTerminal
            agentId={agent.id}
            focused={agent.id === selectedAgentId}
            onFocus={() => onSelectAgent(agent.id)}
          />
        ),
        id: agent.id,
      })),
    [agents, onSelectAgent, selectedAgentId],
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
