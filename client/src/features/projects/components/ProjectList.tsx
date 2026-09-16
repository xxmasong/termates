import type { Project } from '@/types';

import { Button, EmptyState, Spinner } from '@/components';

import { ProjectListItem } from './ProjectListItem';

export interface ProjectListProps {
  projects: Project[];
  selectedProjectId: string | null;
  loading?: boolean;
  error?: string | null;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
  onDeleteProject: (project: Project) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  selectedProjectId,
  loading = false,
  error,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
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
          onDelete={onDeleteProject}
          onSelect={onSelectProject}
          project={project}
          selected={project.id === selectedProjectId}
        />
      ))}
    </div>
  </section>
);
