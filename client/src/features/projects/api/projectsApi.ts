import { apiRequest } from '@/lib/api';
import type { Project } from '@/types';

import type { CreateProjectInput, UpdateProjectInput } from '../types';

export const listProjects = (): Promise<Project[]> => apiRequest<Project[]>('/projects');

export const createProject = (input: CreateProjectInput): Promise<Project> =>
  apiRequest<Project, CreateProjectInput>('/projects', {
    body: input,
    method: 'POST',
  });

export const updateProject = (projectId: string, input: UpdateProjectInput): Promise<Project> =>
  apiRequest<Project, UpdateProjectInput>(`/projects/${projectId}`, {
    body: input,
    method: 'PUT',
  });

export const deleteProject = async (projectId: string, removeData: boolean): Promise<void> => {
  await apiRequest<undefined>(`/projects/${projectId}?removeData=${removeData ? 'true' : 'false'}`, {
    method: 'DELETE',
  });
};
