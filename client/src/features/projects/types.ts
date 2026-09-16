import type { Project } from '@/types';

export interface CreateProjectInput {
  name: string;
  cwd: string;
  description?: string;
}

export type UpdateProjectInput = Partial<Project>;

export interface DeleteProjectInput {
  projectId: string;
  removeData: boolean;
}
