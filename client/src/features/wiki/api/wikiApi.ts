import type { SharedContent } from '@/types';

import { apiRequest } from '@/lib/api';
import { encodePathFilename } from '@/lib/utils/filenames';

import type { UpdateWikiInput, WikiStatus } from '../types';

export const getWikiStatus = (projectId: string): Promise<WikiStatus> =>
  apiRequest<WikiStatus>(`/projects/${projectId}/wiki/status`);

export const initializeWiki = (projectId: string): Promise<WikiStatus> =>
  apiRequest<WikiStatus>(`/projects/${projectId}/wiki/initialize`, { method: 'POST' });

export const listWikiFiles = (projectId: string): Promise<SharedContent[]> =>
  apiRequest<SharedContent[]>(`/projects/${projectId}/wiki`);

export const getWikiFile = (projectId: string, filename: string): Promise<SharedContent> =>
  apiRequest<SharedContent>(`/projects/${projectId}/wiki/${encodePathFilename(filename)}`);

export const updateWikiFile = (
  projectId: string,
  filename: string,
  input: UpdateWikiInput,
): Promise<SharedContent> =>
  apiRequest<SharedContent, UpdateWikiInput>(
    `/projects/${projectId}/wiki/${encodePathFilename(filename)}`,
    {
      body: input,
      method: 'PUT',
    },
  );

