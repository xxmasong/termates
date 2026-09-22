import type { Project } from '@/types';

export interface CreateProjectInput {
  name: string;
  cwd: string;
  description?: string;
}

export type UpdateProjectInput = Partial<Pick<Project, 'name' | 'cwd' | 'description'>>;

export interface DeleteProjectInput {
  projectId: string;
  removeData: boolean;
}
