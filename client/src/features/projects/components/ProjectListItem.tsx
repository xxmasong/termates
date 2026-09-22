import type { Project } from '@/types';

import { Button } from '@/components';

interface ProjectListItemSummary {
  total: number;
  alive: number;
}

export interface ProjectListItemProps {
  project: Project;
  summary?: ProjectListItemSummary;
  selected: boolean;
  onSelect: (projectId: string) => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

export const ProjectListItem: React.FC<ProjectListItemProps> = ({
  project,
  summary,
  selected,
  onSelect,
  onEdit,
  onDelete,
}) => (
  <div className={`project-list-item${selected ? ' project-list-item--selected' : ''}`}>
    <button className="project-list-item__select" onClick={() => onSelect(project.id)} type="button">
      <span className="project-list-item__body">
        <span className="project-list-item__name">{project.name}</span>
      </span>
      {summary ? (
        <span className={summary.alive > 0 ? 'project-list-item__running-chip' : 'project-list-item__total-chip'}>
          {summary.alive > 0 ? `${summary.alive}/${summary.total}` : summary.total}
        </span>
      ) : null}
    </button>
    {onEdit || onDelete ? (
      <span className="project-list-item__actions">
        {onEdit ? (
          <Button
            aria-label={`Edit ${project.name}`}
            icon="gear"
            iconOnly
            onClick={() => onEdit(project)}
            size="sm"
            title="Edit project"
            variant="ghost"
          />
        ) : null}
        {onDelete ? (
          <Button
            aria-label={`Delete ${project.name}`}
            icon="x"
            iconOnly
            onClick={() => onDelete(project)}
            size="sm"
            title="Delete project"
            variant="ghost"
          />
        ) : null}
      </span>
    ) : null}
  </div>
);
