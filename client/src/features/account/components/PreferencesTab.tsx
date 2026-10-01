import { useCallback } from 'react';

import { Button, FormField } from '@/components';
import { THEMES, useThemePreference, type ThemeName } from '@/features/settings';

import { ACCOUNT_COPY } from '../constants';

const THEME_FIELD_ID = 'account-theme';

interface PreferencesTabProps {
  onOpenVoiceSettings: () => void;
}

export const PreferencesTab: React.FC<PreferencesTabProps> = ({ onOpenVoiceSettings }) => {
  const [theme, setTheme] = useThemePreference();
  const onTheme = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => setTheme(event.target.value as ThemeName),
    [setTheme],
  );

  return (
    <div className="account-tab">
      <section className="account-section">
        <h3>{ACCOUNT_COPY.themeTitle}</h3>
        <FormField htmlFor={THEME_FIELD_ID} label={ACCOUNT_COPY.themeLabel}>
          <select className="input" id={THEME_FIELD_ID} onChange={onTheme} value={theme}>
            {THEMES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
      </section>
      <section className="account-section">
        <h3>{ACCOUNT_COPY.voiceTitle}</h3>
        <p className="account-muted">{ACCOUNT_COPY.voiceBody}</p>
        <div>
          <Button icon="volume" onClick={onOpenVoiceSettings}>
            {ACCOUNT_COPY.voiceButton}
          </Button>
        </div>
      </section>
    </div>
  );
};
