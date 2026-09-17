import type { CSSProperties } from 'react';

import type { Agent } from '@/types';

import { Button, Spinner } from '@/components';
import { classNames } from '@/lib/utils';

import { AGENT_CLI_OPTIONS } from '../constants';
import { agentHue } from '../utils';

export interface SidebarAgentListProps {
  agents: Agent[];
  selectedAgentId: string | null;
  selectedProjectName?: string;
  loading?: boolean;
  error?: string | null;
  modKey: string;
  onCreateAgent: () => void;
  onDeleteAgent: (agent: Agent) => void;
  onSelectAgent: (agentId: string) => void;
}

export const SidebarAgentList: React.FC<SidebarAgentListProps> = ({
  agents,
  selectedAgentId,
  selectedProjectName,
  loading = false,
  error,
  modKey,
  onCreateAgent,
  onDeleteAgent,
  onSelectAgent,
}) => (
  <section className="sidebar-agent-list">
    <header className="feature-section-header feature-section-header--spaced">
      <span>{selectedProjectName ? `${selectedProjectName} · agents` : 'Agents'}</span>
      {selectedProjectName ? (
        <Button
          aria-label="Add agent"
          icon="plus"
          iconOnly
          onClick={onCreateAgent}
          size="sm"
          title="Add agent"
          variant="ghost"
        />
      ) : null}
    </header>

    <div className="sidebar-agent-list__items">
      {loading ? (
        <div className="feature-loading">
          <Spinner />
        </div>
      ) : null}
      {error ? <div className="feature-error">{error}</div> : null}
      {!loading && !selectedProjectName ? (
        <div className="sidebar-agent-list__hint">Select a project above</div>
      ) : null}
      {!loading && selectedProjectName && agents.length === 0 ? (
        <div className="sidebar-agent-list__hint">No agents yet</div>
      ) : null}
      {agents.map((agent, index) => {
        const cliOption = AGENT_CLI_OPTIONS.find((option) => option.value === agent.cli);
        const hue = agentHue(agent.name);

        return (
          <article
            className={classNames(
              'sidebar-agent-row',
              agent.id === selectedAgentId && 'sidebar-agent-row--selected',
            )}
            key={agent.id}
            style={{ '--agent-color': hue } as CSSProperties}
          >
            <button
              className="sidebar-agent-row__select"
              onClick={() => onSelectAgent(agent.id)}
              type="button"
            >
              <span className={classNames('status-dot', `status-dot--${agent.status}`)} />
              <span className="sidebar-agent-row__body">
                <span className="sidebar-agent-row__name">
                  <span>{agent.name}</span>
                  <span className="sidebar-agent-row__cli">{cliOption?.label ?? agent.cli}</span>
                </span>
                <span className="sidebar-agent-row__meta">{agent.role || agent.cwd}</span>
              </span>
              <span className="sidebar-agent-row__actions">
                {index < 5 ? <span className="sidebar-agent-row__shortcut">{modKey}{index + 1}</span> : null}
              </span>
            </button>
            <Button
              aria-label={`Delete ${agent.name}`}
              className="sidebar-agent-row__delete"
              icon="x"
              iconOnly
              onClick={() => onDeleteAgent(agent)}
              size="sm"
              title="Delete agent"
              variant="ghost"
            />
          </article>
        );
      })}
    </div>
  </section>
);
