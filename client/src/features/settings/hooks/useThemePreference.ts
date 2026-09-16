import { useCallback, useEffect } from 'react';

import { STORAGE_KEYS } from '@/constants';
import { useLocalStorage } from '@/lib/hooks';

import { THEMES, type ThemeName } from '../constants';

const isThemeName = (value: string): value is ThemeName =>
  THEMES.some((theme) => theme.value === value);

export const useThemePreference = () => {
  const [theme, setStoredTheme] = useLocalStorage<ThemeName>(STORAGE_KEYS.THEME, 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = isThemeName(theme) ? theme : 'dark';
  }, [theme]);

  const setTheme = useCallback(
    (nextTheme: ThemeName) => {
      setStoredTheme(nextTheme);
    },
    [setStoredTheme],
  );

  return [theme, setTheme] as const;
};

