import type { Project } from '@/types';

import { Button, Icon } from '@/components';

export interface ProjectListItemProps {
  project: Project;
  selected: boolean;
  onSelect: (projectId: string) => void;
  onDelete: (project: Project) => void;
}

export const ProjectListItem: React.FC<ProjectListItemProps> = ({
  project,
  selected,
  onSelect,
  onDelete,
}) => (
  <div className={`project-list-item${selected ? ' project-list-item--selected' : ''}`}>
    <button className="project-list-item__select" onClick={() => onSelect(project.id)} type="button">
      <Icon name="folder" size={14} />
      <span className="project-list-item__body">
        <span className="project-list-item__name">{project.name}</span>
        <span className="project-list-item__cwd">{project.cwd}</span>
        {project.description ? (
          <span className="project-list-item__description" title={project.description}>
            {project.description}
          </span>
        ) : null}
      </span>
    </button>
    <Button
      aria-label={`Delete ${project.name}`}
      icon="x"
      iconOnly
      onClick={() => onDelete(project)}
      size="sm"
      variant="ghost"
    />
  </div>
);
