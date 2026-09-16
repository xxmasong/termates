import { useEffect, useRef, useState } from 'react';

import { WAKE_WORD_ARM_TIMEOUT_MS, WAKE_WORD_RESTART_MS } from '../constants';

interface WakeOptions {
  enabled: boolean;
  phrase: string;
  language?: string;
  onCommand: (text: string) => void;
  onWake: () => void;
}

interface SpeechResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: () => void;
  onresult: (event: SpeechResultEvent) => void;
  onerror: (event: { error?: string }) => void;
  onend: () => void;
  start: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const getSpeechRecognition = (): SpeechRecognitionCtor | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const source = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return source.SpeechRecognition ?? source.webkitSpeechRecognition;
};

export const useWakeWord = ({ enabled, phrase, language = 'zh-TW', onCommand, onWake }: WakeOptions) => {
  const [armed, setArmed] = useState(false);
  const [listening, setListening] = useState(false);
  const armedRef = useRef(false);
  const phraseRef = useRef(phrase);
  const callbacksRef = useRef({ onCommand, onWake });
  const recognitionCtor = getSpeechRecognition();

  phraseRef.current = phrase;
  callbacksRef.current = { onCommand, onWake };

  useEffect(() => {
    if (!recognitionCtor || !enabled || !phrase.trim()) {
      setListening(false);
      setArmed(false);
      armedRef.current = false;
      return undefined;
    }

    const Recognition = recognitionCtor;
    let stopped = false;
    let recognition: SpeechRecognitionLike | null = null;
    let restartTimer: ReturnType<typeof setTimeout> | null = null;
    let armTimer: ReturnType<typeof setTimeout> | null = null;

    const clearArmTimer = (): void => {
      if (armTimer) {
        clearTimeout(armTimer);
        armTimer = null;
      }
    };
    const setArmedState = (next: boolean): void => {
      armedRef.current = next;
      setArmed(next);
    };
    const scheduleRestart = (): void => {
      if (stopped || restartTimer) {
        return;
      }
      restartTimer = setTimeout(() => {
        restartTimer = null;
        start();
      }, WAKE_WORD_RESTART_MS);
    };
    const handleResult = (event: SpeechResultEvent): void => {
      const last = event.results[event.results.length - 1];
      if (!last?.isFinal) {
        return;
      }

      const raw = String(last[0]?.transcript ?? '').trim();
      if (!raw) {
        return;
      }

      if (armedRef.current) {
        clearArmTimer();
        setArmedState(false);
        callbacksRef.current.onCommand(raw);
        return;
      }

      const term = phraseRef.current.trim().toLowerCase();
      const hit = raw.toLowerCase().indexOf(term);
      if (hit < 0) {
        return;
      }

      const after = raw
        .slice(hit + term.length)
        .replace(/^[\s,，。、:：!！?？]+/, '')
        .trim();
      if (after) {
        callbacksRef.current.onCommand(after);
        return;
      }

      callbacksRef.current.onWake();
      setArmedState(true);
      clearArmTimer();
      armTimer = setTimeout(() => setArmedState(false), WAKE_WORD_ARM_TIMEOUT_MS);
    };
    function start(): void {
      if (stopped) {
        return;
      }

      try {
        recognition = new Recognition();
        recognition.lang = language;
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.onstart = () => setListening(true);
        recognition.onresult = handleResult;
        recognition.onerror = (event) => {
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            stopped = true;
          }
        };
        recognition.onend = () => {
          recognition = null;
          setListening(false);
          scheduleRestart();
        };
        recognition.start();
      } catch {
        recognition = null;
        scheduleRestart();
      }
    }

    start();

    return () => {
      stopped = true;
      if (restartTimer) {
        clearTimeout(restartTimer);
      }
      clearArmTimer();
      setArmedState(false);
      setListening(false);
      try {
        recognition?.abort();
      } catch {
        // Ignore browser teardown races.
      }
      recognition = null;
    };
  }, [enabled, language, recognitionCtor, phrase]);

  return { armed, listening, supported: Boolean(recognitionCtor) };
};
