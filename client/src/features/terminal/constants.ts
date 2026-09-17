import type { BadgeTone, GridLayoutMode, IconName } from '@/components';
import type { AgentStatus } from '@/types';

export const TERMINAL_RESIZE_DEBOUNCE_MS = 50;
export const TERMINAL_INITIAL_SCROLL_IDLE_MS = 150;
export const TERMINAL_INITIAL_LOAD_MS = 2_000;

export const TERMINAL_LAYOUT_OPTIONS: Array<{
  icon: IconName;
  label: string;
  value: GridLayoutMode;
}> = [
  { icon: 'single', label: 'Single', value: 'single' },
  { icon: 'twoup', label: '2-up', value: '2up' },
  { icon: 'threeup', label: '3-up', value: '3up' },
  { icon: 'grid', label: 'Grid', value: 'grid' },
  { icon: 'canvas', label: 'Canvas', value: 'canvas' },
];

export const AGENT_PANE_STATUS_LABELS: Record<AgentStatus, string> = {
  awaiting_input: 'awaiting you',
  idle: 'idle',
  running: 'running',
  stopped: 'stopped',
};

export const AGENT_PANE_STATUS_TONES: Record<AgentStatus, BadgeTone> = {
  awaiting_input: 'attention',
  idle: 'idle',
  running: 'success',
  stopped: 'neutral',
};
