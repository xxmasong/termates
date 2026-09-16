import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { AgentStatus } from '@/types';

import {
  AppHeader,
  AppShell,
  CommandPaletteShell,
  EmptyState,
  Icon,
  Modal,
  NotificationHost,
  SidebarShell,
  StatusBar,
  TabBar,
  Toolbar,
  ToolbarGroup,
  type CommandPaletteItem,
  type GridLayoutMode,
  type NotificationItem,
  type StatusBarCount,
} from '@/components';
import { STORAGE_KEYS } from '@/constants';
import { ActivityFeed } from '@/features/activity';
import { CreateAgentModal, SidebarAgentList } from '@/features/agents';
import { BrainPanel, KeeperHud, useBrainActions, useBrainState, type KeeperHudNotice } from '@/features/brain';
import { ContentPanel } from '@/features/content';
import { MessagesPanel } from '@/features/messages';
import { CreateProjectModal, DeleteProjectDialog, ProjectList } from '@/features/projects';
import { SettingsModal, THEMES, useThemePreference, type ThemeName } from '@/features/settings';
import { TerminalWorkspace, TERMINAL_LAYOUT_OPTIONS, useTerminalLayoutMode } from '@/features/terminal';
import { UsageMeters, useSpeechInput } from '@/features/voice';
import { WikiPanel } from '@/features/wiki';
import { useLocalStorage } from '@/lib/hooks';
import { useWsStatus } from '@/lib/ws';

import { useProjectAgentShell } from './hooks';

type WorkspaceId = 'terminals' | 'messages' | 'content' | 'wiki' | 'activity';

const WORKSPACES: Array<{ id: WorkspaceId; label: string; icon: ReactNode }> = [
  { id: 'terminals', label: 'Terminals', icon: <Icon name="terminal" size={14} /> },
  { id: 'messages', label: 'Messages', icon: <Icon name="message" size={14} /> },
  { id: 'content', label: 'Content', icon: <Icon name="file" size={14} /> },
  { id: 'wiki', label: 'Wiki', icon: <Icon name="book" size={14} /> },
  { id: 'activity', label: 'Activity', icon: <Icon name="activity" size={14} /> },
];

const NOTIFICATION_LIMIT = 5;

const MOD_KEY =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

const SHORTCUTS = [
  { keys: `${MOD_KEY}K`, label: 'palette' },
  { keys: `${MOD_KEY}J`, label: 'command' },
  { keys: `${MOD_KEY};`, label: 'voice' },
  { keys: `${MOD_KEY}1-5`, label: 'agent' },
];

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
  const [workspace, setWorkspace] = useState<WorkspaceId>('terminals');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandPanelOpen, setCommandPanelOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const previousAgentStatusRef = useRef<Map<string, AgentStatus>>(new Map());
  const [layoutMode, setLayoutMode] = useTerminalLayoutMode();
  const [quickCommand, setQuickCommand] = useState('');
  const [theme, setTheme] = useThemePreference();
  const wsStatus = useWsStatus();
  const { brainState } = useBrainState();
  const { sendMessage: sendBrainMessage } = useBrainActions();
  const brainStatus = brainState.status;

  const submitQuickCommand = useCallback(() => {
    const text = quickCommand.trim();

    if (!text) {
      return;
    }

    sendBrainMessage(text);
    setQuickCommand('');
  }, [quickCommand, sendBrainMessage]);

  // Dictation appends into the same box the keyboard types into.
  const speech = useSpeechInput(
    useCallback((text: string, final: boolean) => {
      if (final) {
        setQuickCommand((current) => (current ? `${current} ${text}` : text));
      }
    }, []),
  );

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((current) => !current);
  }, [setSidebarCollapsed]);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const openCommandPanel = useCallback(() => setCommandPanelOpen(true), []);
  const closeCommandPanel = useCallback(() => setCommandPanelOpen(false), []);

  const cycleTheme = useCallback(() => {
    const order: ThemeName[] = THEMES.map((entry) => entry.value);
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  }, [setTheme, theme]);

  const { selectedProject, requestDeleteProject } = vm;
  const deleteSelectedProject = useMemo(
    () => (selectedProject ? () => requestDeleteProject(selectedProject) : undefined),
    [requestDeleteProject, selectedProject],
  );

  const statusCounts = useMemo<StatusBarCount[]>(
    () =>
      (['running', 'awaiting_input', 'idle', 'stopped'] as const).map((tone) => ({
        label:
          tone === 'awaiting_input' ? 'awaiting you' : tone === 'running' ? 'running' : tone,
        tone,
        value: vm.agents.filter((agent) => agent.status === tone).length,
      })),
    [vm.agents],
  );

  const onSidebarLayoutChange = useCallback(
    (layout: { collapsed: boolean; width: number }) => {
      setSidebarCollapsed(layout.collapsed);
      setSidebarWidth(layout.width);
    },
    [setSidebarCollapsed, setSidebarWidth],
  );
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const onWorkspaceChange = useCallback((id: string) => setWorkspace(id as WorkspaceId), []);
  const openVoiceShortcut = useCallback(() => {
    if (speech.supported) {
      speech.toggle();
    }
  }, [speech]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const mod = event.metaKey || event.ctrlKey;

      if (!mod) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }

      if (key === 'j') {
        event.preventDefault();
        setCommandPanelOpen(true);
        return;
      }

      if (event.key === ';') {
        event.preventDefault();
        openVoiceShortcut();
        return;
      }

      if (/^[1-5]$/.test(event.key)) {
        const agent = vm.agents[Number(event.key) - 1];
        if (agent) {
          event.preventDefault();
          vm.selectAgent(agent.id);
          setWorkspace('terminals');
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openVoiceShortcut, vm]);

  useEffect(() => {
    const previous = previousAgentStatusRef.current;

    vm.agents.forEach((agent) => {
      const priorStatus = previous.get(agent.id);
      if (agent.status === 'awaiting_input' && priorStatus !== 'awaiting_input') {
        setNotifications((current) =>
          [
            {
              id: `${agent.id}:${Date.now()}`,
              message: `${agent.name} is waiting for a human response.`,
              title: 'Agent needs input',
              tone: 'warning' as const,
            },
            ...current,
          ].slice(0, NOTIFICATION_LIMIT),
        );
      }
      previous.set(agent.id, agent.status);
    });
  }, [vm.agents]);

  const workspaceTabs = useMemo(
    () =>
      WORKSPACES.map((item) => ({
        ...item,
        count:
          item.id === 'messages'
            ? vm.agents.filter((agent) => agent.status === 'awaiting_input').length
            : undefined,
      })),
    [vm.agents],
  );

  const keeperNotices = useMemo<KeeperHudNotice[]>(
    () =>
      vm.agents
        .filter((agent) => agent.status === 'awaiting_input')
        .map((agent) => ({
          agentId: agent.id,
          agentName: agent.name,
          projectId: agent.projectId,
          projectName: vm.selectedProject?.name ?? 'Current project',
        })),
    [vm.agents, vm.selectedProject?.name],
  );

  const commandItems = useMemo<CommandPaletteItem[]>(() => {
    const workspaceCommands = WORKSPACES.map((item) => ({
      description: 'Switch workspace',
      group: 'Workspace',
      icon: item.icon,
      id: `workspace:${item.id}`,
      label: `Open ${item.label}`,
    }));
    const projectCommands = vm.projects.map((project) => ({
      description: project.cwd,
      group: 'Projects',
      icon: <Icon name="folder" size={14} />,
      id: `project:${project.id}`,
      label: project.name,
    }));
    const agentCommands = vm.agents.flatMap((agent) => [
      {
        description: agent.role ?? agent.cli,
        group: 'Agents',
        icon: <Icon name="terminal" size={14} />,
        id: `agent:${agent.id}`,
        label: `Focus ${agent.name}`,
      },
      {
        description: agent.name,
        disabled: vm.lifecycleBusy,
        group: 'Agent Actions',
        icon: <Icon name="play" size={14} />,
        id: `agent-action:start:${agent.id}`,
        label: `Start ${agent.name}`,
      },
      {
        description: agent.name,
        disabled: vm.lifecycleBusy,
        group: 'Agent Actions',
        icon: <Icon name="stop" size={14} />,
        id: `agent-action:stop:${agent.id}`,
        label: `Stop ${agent.name}`,
      },
    ]);
    const layoutCommands = TERMINAL_LAYOUT_OPTIONS.map((option) => ({
      description: 'Change terminal grid',
      group: 'Layout',
      icon: <Icon name={option.icon} size={14} />,
      id: `layout:${option.value}`,
      label: option.label,
    }));

    return [
      { group: 'System', icon: <Icon name="settings" size={14} />, id: 'settings:open', label: 'Open Settings' },
      ...workspaceCommands,
      ...layoutCommands,
      ...projectCommands,
      ...agentCommands,
    ];
  }, [vm.agents, vm.lifecycleBusy, vm.projects]);

  const onCommandSelect = useCallback(
    (id: string) => {
      if (id === 'settings:open') {
        setSettingsOpen(true);
        return;
      }
      if (id.startsWith('workspace:')) {
        setWorkspace(id.slice('workspace:'.length) as WorkspaceId);
        return;
      }
      if (id.startsWith('project:')) {
        vm.selectProject(id.slice('project:'.length));
        setWorkspace('terminals');
        return;
      }
      if (id.startsWith('agent:')) {
        vm.selectAgent(id.slice('agent:'.length));
        setWorkspace('terminals');
        return;
      }
      if (id.startsWith('layout:')) {
        setLayoutMode(id.slice('layout:'.length) as GridLayoutMode);
        setWorkspace('terminals');
        return;
      }
      if (id.startsWith('agent-action:')) {
        const [, action, agentId] = id.split(':');
        const agent = vm.agents.find((item) => item.id === agentId);
        if (!agent) {
          return;
        }
        if (action === 'start') {
          vm.startAgent(agent);
        } else if (action === 'stop') {
          vm.stopAgent(agent);
        }
      }
    },
    [setLayoutMode, vm],
  );

  const main = useMemo(() => {
    if (!vm.selectedProject) {
      return (
        <EmptyState
          action={
            <button className="empty-state__primary-action" onClick={vm.openCreateProject} type="button">
              <Icon name="plus" size={11} />
              <span>New Project</span>
            </button>
          }
          title="Select or create a project to get started"
        />
      );
    }

    return (
      <section className="shell-workspace">
        <Toolbar align="between" className="shell-workspace__bar">
          <ToolbarGroup>
            <TabBar
              activeId={workspace}
              ariaLabel="Workspace"
              items={workspaceTabs}
              onChange={onWorkspaceChange}
            />
          </ToolbarGroup>
          <ToolbarGroup>
            <button className="shell-workspace__command" onClick={openPalette} type="button">
              <Icon name="search" size={13} />
              <span>Command</span>
            </button>
          </ToolbarGroup>
        </Toolbar>
        {workspace === 'terminals' ? (
          <TerminalWorkspace
            agents={vm.agents}
            onSelectAgent={vm.selectAgent}
            selectedAgentId={vm.selectedAgentId}
          />
        ) : null}
        {workspace === 'messages' ? (
          <MessagesPanel
            agents={vm.agents}
            projectId={vm.selectedProject.id}
            selectedAgentId={vm.selectedAgentId}
          />
        ) : null}
        {workspace === 'content' ? (
          <ContentPanel author={vm.selectedAgentId ?? 'user'} projectId={vm.selectedProject.id} />
        ) : null}
        {workspace === 'wiki' ? <WikiPanel projectId={vm.selectedProject.id} /> : null}
        {workspace === 'activity' ? <ActivityFeed projectId={vm.selectedProject.id} /> : null}
      </section>
    );
  }, [onWorkspaceChange, openPalette, vm, workspace, workspaceTabs]);

  const selectHudAgent = useCallback(
    (_projectId: string, agentId: string) => {
      vm.selectAgent(agentId);
      setWorkspace('terminals');
      setCommandPanelOpen(false);
    },
    [vm],
  );

  return (
    <>
      <AppShell
        header={
          <AppHeader
            breadcrumb={
              vm.selectedProject
                ? { meta: vm.selectedProject.cwd, title: vm.selectedProject.name }
                : undefined
            }
            commandBusy={brainStatus === 'thinking'}
            commandHasReply={false}
            commandPlaceholder={
              brainStatus === 'thinking' ? 'The Keeper is working…' : 'Ask The Keeper…'
            }
            commandValue={quickCommand}
            layoutOptions={TERMINAL_LAYOUT_OPTIONS}
            layoutValue={layoutMode}
            micListening={speech.listening}
            micSupported={speech.supported}
            micTitle={speech.error ?? undefined}
            modKey={MOD_KEY}
            notifications={
              <NotificationHost items={notifications} />
            }
            onCommandChange={setQuickCommand}
            onCommandSubmit={submitQuickCommand}
            onDeleteProject={deleteSelectedProject}
            onLayoutChange={setLayoutMode}
            onOpenCommandPanel={openCommandPanel}
            onOpenPalette={openPalette}
            onOpenSettings={openSettings}
            onToggleMic={speech.toggle}
            onToggleSidebar={toggleSidebar}
            onToggleTheme={cycleTheme}
            sidebarCollapsed={sidebarCollapsed}
            themeIcon={theme === 'light' ? 'sun' : 'moon'}
          />
        }
        statusBar={
          <StatusBar connected={wsStatus === 'open'} counts={statusCounts} shortcuts={SHORTCUTS} />
        }
        sidebar={
          <SidebarShell onLayoutChange={onSidebarLayoutChange}>
            <ProjectList
              agentSummaries={vm.projectAgentSummaries}
              error={vm.projectsError}
              loading={vm.projectsLoading}
              onCreateProject={vm.openCreateProject}
              onSelectProject={vm.selectProject}
              projects={vm.projects}
              selectedProjectId={vm.selectedProjectId}
            />
            <SidebarAgentList
              agents={vm.agents}
              error={vm.agentsError}
              loading={vm.agentsLoading}
              modKey={MOD_KEY}
              onCreateAgent={vm.openCreateAgent}
              onDeleteAgent={vm.deleteAgent}
              onSelectAgent={vm.selectAgent}
              selectedAgentId={vm.selectedAgentId}
              selectedProjectName={vm.selectedProject?.name}
            />
            <UsageMeters />
          </SidebarShell>
        }
        sidebarCollapsed={sidebarCollapsed}
        sidebarWidth={sidebarWidth}
        main={main}
        rightPanel={undefined}
        rightPanelWidth={360}
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
      <CommandPaletteShell
        items={commandItems}
        onClose={closePalette}
        onSelect={onCommandSelect}
        open={paletteOpen}
        placeholder="Run a command"
      />
      <SettingsModal onClose={closeSettings} open={settingsOpen} />
      <Modal
        onClose={closeCommandPanel}
        open={commandPanelOpen}
        title="The Keeper"
        width={620}
      >
        <BrainPanel />
      </Modal>
      <KeeperHud
        awaiting={keeperNotices}
        headerListening={speech.listening}
        idleCount={vm.agents.filter((agent) => agent.status === 'idle').length}
        onOpenFull={openCommandPanel}
        onSelectAgent={selectHudAgent}
        runningCount={vm.agents.filter((agent) => agent.status === 'running').length}
      />
      <NotificationHost items={notifications} />
    </>
  );
};
