import type { SharedContent } from '@/types';

import { apiRequest } from '@/lib/api';
import { encodePathFilename } from '@/lib/utils/filenames';

import type { CreateContentInput, UpdateContentInput } from '../types';

export const listContent = (projectId: string): Promise<SharedContent[]> =>
  apiRequest<SharedContent[]>(`/projects/${projectId}/content`);

export const getContent = (projectId: string, filename: string): Promise<SharedContent> =>
  apiRequest<SharedContent>(`/projects/${projectId}/content/${encodePathFilename(filename)}`);

export const createContent = (
  projectId: string,
  input: CreateContentInput,
): Promise<SharedContent> =>
  apiRequest<SharedContent, CreateContentInput>(`/projects/${projectId}/content`, {
    body: input,
    method: 'POST',
  });

export const updateContent = (
  projectId: string,
  filename: string,
  input: UpdateContentInput,
): Promise<SharedContent> =>
  apiRequest<SharedContent, UpdateContentInput>(
    `/projects/${projectId}/content/${encodePathFilename(filename)}`,
    {
      body: input,
      method: 'PUT',
    },
  );

export const deleteContent = (projectId: string, filename: string): Promise<undefined> =>
  apiRequest<undefined>(`/projects/${projectId}/content/${encodePathFilename(filename)}`, {
    method: 'DELETE',
  });
