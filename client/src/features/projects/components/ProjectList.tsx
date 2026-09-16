import type { Project } from '@/types';

import { Button, EmptyState, Spinner } from '@/components';

import { ProjectListItem } from './ProjectListItem';

interface ProjectListAgentSummary {
  total: number;
  alive: number;
}

export interface ProjectListProps {
  projects: Project[];
  agentSummaries?: Record<string, ProjectListAgentSummary>;
  selectedProjectId: string | null;
  loading?: boolean;
  error?: string | null;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  agentSummaries,
  selectedProjectId,
  loading = false,
  error,
  onSelectProject,
  onCreateProject,
}) => (
  <section className="project-list">
    <header className="feature-section-header">
      <span>Projects</span>
      <Button icon="plus" iconOnly onClick={onCreateProject} size="sm" variant="ghost" />
    </header>
    {loading ? (
      <div className="feature-loading">
        <Spinner />
      </div>
    ) : null}
    {error ? <div className="feature-error">{error}</div> : null}
    {!loading && projects.length === 0 ? (
      <EmptyState
        action={
          <Button icon="plus" onClick={onCreateProject} size="sm" variant="primary">
            New project
          </Button>
        }
        title="No projects"
      />
    ) : null}
    <div className="project-list__items">
      {projects.map((project) => (
        <ProjectListItem
          key={project.id}
          onSelect={onSelectProject}
          project={project}
          summary={agentSummaries?.[project.id]}
          selected={project.id === selectedProjectId}
        />
      ))}
    </div>
  </section>
);
