import { useCallback } from 'react';
import { Icon } from '@/components';
import { useThemePreference } from '@/features/settings';
interface ThemeToggleProps {
  children?: never;
}
export const ThemeToggle: React.FC<ThemeToggleProps> = () => {
  const [theme, setTheme] = useThemePreference();
  const toggle = useCallback(
    () => setTheme(theme === 'light' ? 'dark' : 'light'),
    [setTheme, theme],
  );
  return (
    <button
      aria-label="Toggle color theme"
      className="landing-theme-toggle"
      onClick={toggle}
      type="button"
    >
      <Icon name={theme === 'light' ? 'moon' : 'sun'} />
    </button>
  );
};
