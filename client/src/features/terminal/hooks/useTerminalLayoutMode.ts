import type { GridLayoutMode } from '@/components';
import { STORAGE_KEYS } from '@/constants';
import { useLocalStorage } from '@/lib/hooks';

export const useTerminalLayoutMode = () =>
  useLocalStorage<GridLayoutMode>(STORAGE_KEYS.LAYOUT_MODE, '3up');
