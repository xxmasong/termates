import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { contentKeys, createContent, deleteContent, getContent, listContent, updateContent } from '../api';
import type { CreateContentInput, UpdateContentInput } from '../types';

export const useContentList = (projectId: string | null) =>
  useQuery({
    enabled: Boolean(projectId),
    queryFn: () => listContent(projectId as string),
    queryKey: contentKeys.list(projectId),
  });

export const useContentItem = (projectId: string | null, filename: string | null) =>
  useQuery({
    enabled: Boolean(projectId && filename),
    queryFn: () => getContent(projectId as string, filename as string),
    queryKey: contentKeys.detail(projectId, filename),
  });

export const useCreateContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: CreateContentInput }) =>
      createContent(projectId, input),
    onSuccess: (_content, variables) => {
      void queryClient.invalidateQueries({ queryKey: contentKeys.project(variables.projectId) });
    },
  });
};

export const useUpdateContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      filename,
      input,
    }: {
      projectId: string;
      filename: string;
      input: UpdateContentInput;
    }) => updateContent(projectId, filename, input),
    onSuccess: (_content, variables) => {
      void queryClient.invalidateQueries({ queryKey: contentKeys.project(variables.projectId) });
    },
  });
};

export const useDeleteContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, filename }: { projectId: string; filename: string }) =>
      deleteContent(projectId, filename),
    onSuccess: (_content, variables) => {
      void queryClient.invalidateQueries({ queryKey: contentKeys.project(variables.projectId) });
    },
  });
};

