import { useCallback } from 'react';

import { AppShell, EmptyState, SidebarShell } from '@/components';
import { STORAGE_KEYS } from '@/constants';
import {
  AgentList,
  CreateAgentModal,
} from '@/features/agents';
import {
  CreateProjectModal,
  DeleteProjectDialog,
  ProjectList,
} from '@/features/projects';
import { useLocalStorage } from '@/lib/hooks';

import { useProjectAgentShell } from './hooks';

interface TermHiveShellProps {
  children?: never;
}

export const TermHiveShell: React.FC<TermHiveShellProps> = () => {
  const vm = useProjectAgentShell();
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage(
    STORAGE_KEYS.SIDEBAR_COLLAPSED,
    false,
  );
  const [sidebarWidth, setSidebarWidth] = useLocalStorage(STORAGE_KEYS.SIDEBAR_WIDTH, 232);
  const onSidebarLayoutChange = useCallback(
    (layout: { collapsed: boolean; width: number }) => {
      setSidebarCollapsed(layout.collapsed);
      setSidebarWidth(layout.width);
    },
    [setSidebarCollapsed, setSidebarWidth],
  );

  return (
    <>
      <AppShell
        sidebar={
          <SidebarShell onLayoutChange={onSidebarLayoutChange}>
            <ProjectList
              error={vm.projectsError}
              loading={vm.projectsLoading}
              onCreateProject={vm.openCreateProject}
              onDeleteProject={vm.requestDeleteProject}
              onSelectProject={vm.selectProject}
              projects={vm.projects}
              selectedProjectId={vm.selectedProjectId}
            />
          </SidebarShell>
        }
        sidebarCollapsed={sidebarCollapsed}
        sidebarWidth={sidebarWidth}
        main={
          vm.selectedProject ? (
            <AgentList
              agents={vm.agents}
              error={vm.agentsError}
              lifecycleBusy={vm.lifecycleBusy}
              loading={vm.agentsLoading}
              onCreateAgent={vm.openCreateAgent}
              onDeleteAgent={vm.deleteAgent}
              onRestartAgent={vm.restartAgent}
              onSelectAgent={vm.selectAgent}
              onStartAgent={vm.startAgent}
              onStopAgent={vm.stopAgent}
              previews={vm.previews}
              selectedAgentId={vm.selectedAgentId}
            />
          ) : (
            <EmptyState title="Select a project" />
          )
        }
      />
      <CreateProjectModal
        loading={vm.createProjectLoading}
        onClose={vm.closeCreateProject}
        onCreate={vm.createProject}
        open={vm.createProjectOpen}
      />
      <CreateAgentModal
        key={vm.selectedProject?.id}
        loading={vm.createAgentLoading}
        onClose={vm.closeCreateAgent}
        onCreate={vm.createAgent}
        open={vm.createAgentOpen}
        projectCwd={vm.selectedProject?.cwd}
      />
      <DeleteProjectDialog
        loading={vm.deleteProjectLoading}
        onCancel={vm.cancelDeleteProject}
        onConfirm={vm.deleteProject}
        project={vm.projectPendingDelete}
      />
    </>
  );
};
