import type { ReactNode } from 'react';

import { Icon, type IconName } from '@/components/atoms';
import { classNames } from '@/lib/utils';

export interface AppHeaderLayoutOption<TValue extends string> {
  icon: IconName;
  label: string;
  value: TValue;
}

export interface AppHeaderProps<TValue extends string> {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  /** Secondary line after the brand — project name and path. */
  breadcrumb?: { title: string; meta?: string };
  onOpenPalette: () => void;
  commandValue: string;
  commandPlaceholder: string;
  commandBusy?: boolean;
  onCommandChange: (value: string) => void;
  onCommandSubmit: () => void;
  onOpenCommandPanel: () => void;
  commandHasReply?: boolean;
  micSupported?: boolean;
  micListening?: boolean;
  micTitle?: string;
  onToggleMic?: () => void;
  layoutOptions: ReadonlyArray<AppHeaderLayoutOption<TValue>>;
  layoutValue: TValue;
  onLayoutChange: (value: TValue) => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  themeIcon: IconName;
  onDeleteProject?: () => void;
  notifications?: ReactNode;
  modKey: string;
}

export const AppHeader = <TValue extends string>({
  sidebarCollapsed,
  onToggleSidebar,
  breadcrumb,
  onOpenPalette,
  commandValue,
  commandPlaceholder,
  commandBusy = false,
  onCommandChange,
  onCommandSubmit,
  onOpenCommandPanel,
  commandHasReply = false,
  micSupported = false,
  micListening = false,
  micTitle,
  onToggleMic,
  layoutOptions,
  layoutValue,
  onLayoutChange,
  onOpenSettings,
  onToggleTheme,
  themeIcon,
  onDeleteProject,
  notifications,
  modKey,
}: AppHeaderProps<TValue>): React.ReactElement => (
  <header className="app-header">
    <div className="app-header__left">
      <button
        aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
        className="app-header__btn app-header__btn--icon"
        onClick={onToggleSidebar}
        title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
        type="button"
      >
        <Icon name={sidebarCollapsed ? 'panelLeftOpen' : 'panelLeft'} size={14} />
      </button>
      <div className="app-header__brand">
        <span className="app-header__brand-mark">
          <Icon name="logo" size={14} />
        </span>
        <span className="app-header__brand-name">TermHive</span>
      </div>
      {breadcrumb ? (
        <div className="app-header__breadcrumb">
          <span className="app-header__breadcrumb-sep">/</span>
          <span className="app-header__breadcrumb-title">{breadcrumb.title}</span>
          {breadcrumb.meta ? (
            <span className="app-header__breadcrumb-meta">{breadcrumb.meta}</span>
          ) : null}
        </div>
      ) : null}
    </div>

    <div className="app-header__right">
      <button
        className="app-header__btn app-header__btn--kbd"
        onClick={onOpenPalette}
        type="button"
      >
        <Icon name="search" size={12} />
        <span>Search</span>
        <kbd>{modKey}K</kbd>
      </button>

      <div className={classNames('app-header__command', commandBusy && 'is-busy')}>
        <button
          aria-label="Open command panel"
          className="app-header__command-mark"
          onClick={onOpenCommandPanel}
          title={`Open Command (${modKey}J)`}
          type="button"
        >
          <Icon name="logo" size={13} />
          {commandHasReply ? <span className="app-header__command-dot" /> : null}
        </button>
        <input
          aria-label="Ask The Keeper"
          className="app-header__command-input"
          disabled={commandBusy}
          onChange={(event) => onCommandChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onCommandSubmit();
            }
          }}
          placeholder={commandPlaceholder}
          value={commandValue}
        />
        {micSupported && onToggleMic ? (
          <button
            aria-label={micListening ? 'Stop listening' : 'Voice input'}
            className={classNames('app-header__command-mic', micListening && 'is-on')}
            onClick={onToggleMic}
            title={micTitle ?? (micListening ? 'Stop listening' : 'Voice input')}
            type="button"
          >
            <Icon name="mic" size={13} />
          </button>
        ) : null}
        <kbd>{modKey}J</kbd>
      </div>

      {notifications}

      <div aria-label="Layout" className="app-header__layout" role="tablist">
        {layoutOptions.map((option) => (
          <button
            aria-selected={option.value === layoutValue}
            className={classNames(option.value === layoutValue && 'is-active')}
            key={option.value}
            onClick={() => onLayoutChange(option.value)}
            role="tab"
            title={option.label}
            type="button"
          >
            <Icon name={option.icon} size={13} />
          </button>
        ))}
      </div>

      <button
        aria-label="Settings"
        className="app-header__btn app-header__btn--icon"
        onClick={onOpenSettings}
        title="Settings"
        type="button"
      >
        <Icon name="settings" size={13} />
      </button>
      <button
        aria-label="Toggle theme"
        className="app-header__btn app-header__btn--icon"
        onClick={onToggleTheme}
        title="Toggle theme"
        type="button"
      >
        <Icon name={themeIcon} size={13} />
      </button>
      {onDeleteProject ? (
        <button
          aria-label="Delete project"
          className="app-header__btn app-header__btn--icon app-header__btn--danger"
          onClick={onDeleteProject}
          title="Delete project"
          type="button"
        >
          <Icon name="x" size={12} />
        </button>
      ) : null}
    </div>
  </header>
);
