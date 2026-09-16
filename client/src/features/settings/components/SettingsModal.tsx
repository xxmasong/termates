import { useCallback, useEffect, useState } from 'react';

import { Button, FormField, Input, Modal, Toolbar, ToolbarGroup } from '@/components';
import {
  UsageView,
  useSpeechInput,
  useUpdateVoiceConfig,
  useVoiceConfig,
  useWakeWord,
  type SpeechProvider,
  type VoiceConfig,
} from '@/features/voice';

import { THEMES, type ThemeName } from '../constants';
import { useThemePreference } from '../hooks';

const PROVIDERS: SpeechProvider[] = ['browser', 'openai', 'gemini'];

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const [theme, setTheme] = useThemePreference();
  const voiceQuery = useVoiceConfig();
  const updateVoiceConfig = useUpdateVoiceConfig();
  const [draft, setDraft] = useState<VoiceConfig>({});
  const speech = useSpeechInput(() => undefined, {
    language: draft.language,
    provider: draft.provider,
  });
  const wake = useWakeWord({
    enabled: Boolean(draft.wakeWordEnabled && open),
    language: draft.language,
    onCommand: () => undefined,
    onWake: () => undefined,
    phrase: draft.wakeWord ?? '',
  });

  useEffect(() => {
    if (voiceQuery.data) {
      setDraft(voiceQuery.data);
    }
  }, [voiceQuery.data]);

  const onThemeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setTheme(event.target.value as ThemeName);
    },
    [setTheme],
  );
  const onProviderChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setDraft((current) => ({ ...current, provider: event.target.value as SpeechProvider }));
  }, []);
  const onLanguageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setDraft((current) => ({ ...current, language: event.target.value }));
  }, []);
  const onWakeWordChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setDraft((current) => ({ ...current, wakeWord: event.target.value }));
  }, []);
  const onWakeEnabledChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setDraft((current) => ({ ...current, wakeWordEnabled: event.target.checked }));
  }, []);
  const onTtsVoiceChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setDraft((current) => ({ ...current, ttsVoice: event.target.value }));
  }, []);
  const onSave = useCallback(() => {
    updateVoiceConfig.mutate(draft);
  }, [draft, updateVoiceConfig]);

  return (
    <Modal
      footer={
        <>
          <Button onClick={onClose} variant="ghost">
            Close
          </Button>
          <Button icon="check" loading={updateVoiceConfig.isPending} onClick={onSave} variant="primary">
            Save
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      title="Settings"
      width={680}
    >
      <div className="settings-modal">
        <section className="settings-section">
          <h3>Theme</h3>
          <FormField label="Color theme">
            <select className="input" onChange={onThemeChange} value={theme}>
              {THEMES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
        </section>

        <section className="settings-section">
          <h3>Voice</h3>
          <div className="settings-grid">
            <FormField label="Speech provider">
              <select className="input" onChange={onProviderChange} value={draft.provider ?? 'browser'}>
                {PROVIDERS.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Language">
              <Input onChange={onLanguageChange} placeholder="zh-TW" value={draft.language ?? ''} />
            </FormField>
            <FormField label="Wake word">
              <Input onChange={onWakeWordChange} placeholder="TermHive" value={draft.wakeWord ?? ''} />
            </FormField>
            <FormField label="TTS voice">
              <Input onChange={onTtsVoiceChange} value={draft.ttsVoice ?? ''} />
            </FormField>
          </div>
          <label className="settings-check">
            <input
              checked={Boolean(draft.wakeWordEnabled)}
              onChange={onWakeEnabledChange}
              type="checkbox"
            />
            <span>Wake word enabled</span>
          </label>
          <Toolbar align="between">
            <ToolbarGroup>
              <span className="settings-status">
                Speech input: {speech.supported ? 'available' : 'unsupported'}
              </span>
              <span className="settings-status">
                Wake word: {wake.supported ? (wake.listening ? 'listening' : 'available') : 'unsupported'}
              </span>
              {wake.armed ? <span className="settings-status">armed</span> : null}
            </ToolbarGroup>
          </Toolbar>
        </section>

        <UsageView />
      </div>
    </Modal>
  );
};

