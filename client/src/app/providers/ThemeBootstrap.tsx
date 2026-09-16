import { useEffect } from 'react';

import { STORAGE_KEYS } from '@/constants';

const FALLBACK_THEME = 'dark';

interface ThemeBootstrapProps {
  children?: never;
}

export const ThemeBootstrap: React.FC<ThemeBootstrapProps> = () => {
  useEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEYS.THEME);
    document.documentElement.dataset.theme = storedTheme || FALLBACK_THEME;
  }, []);

  return null;
};
