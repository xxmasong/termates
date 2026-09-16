import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getWikiFile, getWikiStatus, initializeWiki, listWikiFiles, updateWikiFile, wikiKeys } from '../api';
import type { UpdateWikiInput } from '../types';

export const useWikiStatus = (projectId: string | null) =>
  useQuery({
    enabled: Boolean(projectId),
    queryFn: () => getWikiStatus(projectId as string),
    queryKey: wikiKeys.status(projectId),
  });

export const useWikiFiles = (projectId: string | null, initialized: boolean) =>
  useQuery({
    enabled: Boolean(projectId && initialized),
    queryFn: () => listWikiFiles(projectId as string),
    queryKey: wikiKeys.list(projectId),
  });

export const useWikiFile = (projectId: string | null, filename: string | null) =>
  useQuery({
    enabled: Boolean(projectId && filename),
    queryFn: () => getWikiFile(projectId as string, filename as string),
    queryKey: wikiKeys.detail(projectId, filename),
  });

export const useInitializeWiki = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId }: { projectId: string }) => initializeWiki(projectId),
    onSuccess: (_status, variables) => {
      void queryClient.invalidateQueries({ queryKey: wikiKeys.status(variables.projectId) });
      void queryClient.invalidateQueries({ queryKey: wikiKeys.project(variables.projectId) });
    },
  });
};

export const useUpdateWikiFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      filename,
      input,
    }: {
      projectId: string;
      filename: string;
      input: UpdateWikiInput;
    }) => updateWikiFile(projectId, filename, input),
    onSuccess: (_file, variables) => {
      void queryClient.invalidateQueries({ queryKey: wikiKeys.project(variables.projectId) });
    },
  });
};

