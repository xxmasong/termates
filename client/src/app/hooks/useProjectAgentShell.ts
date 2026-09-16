import { useCallback, useMemo, useState } from 'react';
import { useRecoilState } from 'recoil';

import type { Agent, Project } from '@/types';

import {
  selectedAgentIdState,
  useAgentLifecycle,
  useAgentPreviews,
  useAgents,
  useCreateAgent,
  useDeleteAgent,
  type CreateAgentInput,
} from '@/features/agents';
import {
  selectedProjectIdState,
  useCreateProject,
  useDeleteProject,
  useProjects,
  type CreateProjectInput,
} from '@/features/projects';

const getErrorMessage = (error: unknown): string | null =>
  error instanceof Error ? error.message : error ? 'Something went wrong.' : null;

export const useProjectAgentShell = () => {
  const [selectedProjectId, setSelectedProjectId] = useRecoilState(selectedProjectIdState);
  const [selectedAgentId, setSelectedAgentId] = useRecoilState(selectedAgentIdState);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createAgentOpen, setCreateAgentOpen] = useState(false);
  const [projectPendingDelete, setProjectPendingDelete] = useState<Project | null>(null);

  const projectsQuery = useProjects();
  const agentsQuery = useAgents(selectedProjectId);
  const previewsQuery = useAgentPreviews(selectedProjectId);
  const createProjectMutation = useCreateProject();
  const deleteProjectMutation = useDeleteProject();
  const createAgentMutation = useCreateAgent();
  const deleteAgentMutation = useDeleteAgent();
  const lifecycle = useAgentLifecycle();

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const agents = useMemo(() => agentsQuery.data ?? [], [agentsQuery.data]);
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const selectProject = useCallback(
    (projectId: string) => {
      setSelectedProjectId(projectId);
      setSelectedAgentId(null);
    },
    [setSelectedAgentId, setSelectedProjectId],
  );

  const selectAgent = useCallback((agentId: string) => setSelectedAgentId(agentId), [setSelectedAgentId]);
  const openCreateProject = useCallback(() => setCreateProjectOpen(true), []);
  const closeCreateProject = useCallback(() => setCreateProjectOpen(false), []);
  const openCreateAgent = useCallback(() => setCreateAgentOpen(true), []);
  const closeCreateAgent = useCallback(() => setCreateAgentOpen(false), []);
  const requestDeleteProject = useCallback((project: Project) => setProjectPendingDelete(project), []);
  const cancelDeleteProject = useCallback(() => setProjectPendingDelete(null), []);

  const createProject = useCallback(
    (input: CreateProjectInput) => {
      createProjectMutation.mutate(input, {
        onSuccess: (project) => {
          setSelectedProjectId(project.id);
          setSelectedAgentId(null);
          setCreateProjectOpen(false);
        },
      });
    },
    [createProjectMutation, setSelectedAgentId, setSelectedProjectId],
  );

  const deleteProject = useCallback(
    (projectId: string, removeData: boolean) => {
      deleteProjectMutation.mutate(
        { projectId, removeData },
        {
          onSuccess: () => {
            if (selectedProjectId === projectId) {
              setSelectedProjectId(null);
              setSelectedAgentId(null);
            }
            setProjectPendingDelete(null);
          },
        },
      );
    },
    [deleteProjectMutation, selectedProjectId, setSelectedAgentId, setSelectedProjectId],
  );

  const createAgent = useCallback(
    (input: CreateAgentInput) => {
      if (!selectedProjectId) {
        return;
      }

      createAgentMutation.mutate(
        { input, projectId: selectedProjectId },
        {
          onSuccess: (agent) => {
            setSelectedAgentId(agent.id);
            setCreateAgentOpen(false);
          },
        },
      );
    },
    [createAgentMutation, selectedProjectId, setSelectedAgentId],
  );

  const deleteAgent = useCallback(
    (agent: Agent) => {
      deleteAgentMutation.mutate(
        { agentId: agent.id, projectId: agent.projectId },
        {
          onSuccess: () => {
            if (selectedAgentId === agent.id) {
              setSelectedAgentId(null);
            }
          },
        },
      );
    },
    [deleteAgentMutation, selectedAgentId, setSelectedAgentId],
  );

  const startAgent = useCallback((agent: Agent) => lifecycle.start({ agentId: agent.id, projectId: agent.projectId }), [lifecycle]);
  const stopAgent = useCallback((agent: Agent) => lifecycle.stop({ agentId: agent.id, projectId: agent.projectId }), [lifecycle]);
  const restartAgent = useCallback(
    (agent: Agent) => lifecycle.restart({ agentId: agent.id, projectId: agent.projectId }),
    [lifecycle],
  );

  return {
    agents,
    agentsError: getErrorMessage(agentsQuery.error),
    agentsLoading: agentsQuery.isLoading,
    cancelDeleteProject,
    closeCreateAgent,
    closeCreateProject,
    createAgent,
    createAgentLoading: createAgentMutation.isPending,
    createAgentOpen,
    createProject,
    createProjectLoading: createProjectMutation.isPending,
    createProjectOpen,
    deleteAgent,
    deleteProject,
    deleteProjectLoading: deleteProjectMutation.isPending,
    lifecycleBusy: lifecycle.isPending,
    openCreateAgent,
    openCreateProject,
    previews: previewsQuery.data ?? {},
    projectPendingDelete,
    projects,
    projectsError: getErrorMessage(projectsQuery.error),
    projectsLoading: projectsQuery.isLoading,
    requestDeleteProject,
    restartAgent,
    selectAgent,
    selectProject,
    selectedAgentId,
    selectedProject,
    selectedProjectId,
    startAgent,
    stopAgent,
  };
};
