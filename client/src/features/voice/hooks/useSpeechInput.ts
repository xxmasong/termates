import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { SpeechProvider, SpeechResultHandler } from '../types';

export interface SpeechOptions {
  provider?: SpeechProvider;
  language?: string;
}

type BrowserRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (event: SpeechResultEvent) => void;
  onerror: (event: { error?: string }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => BrowserRecognition;

interface SpeechResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

type ActiveCapture =
  | { kind: 'browser'; recognition: BrowserRecognition }
  | { kind: 'recorder'; recorder: MediaRecorder; stream: MediaStream }
  | null;

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

const explainError = (code: string, secure: boolean): string => {
  if (!secure) {
    return 'Speech recognition needs localhost or HTTPS.';
  }

  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access is blocked.';
    case 'no-speech':
      return 'No speech was detected.';
    case 'audio-capture':
      return 'No microphone was found.';
    case 'network':
      return 'The speech service is unreachable.';
    default:
      return code || 'Speech input failed.';
  }
};

export const useSpeechInput = (onText: SpeechResultHandler, options: SpeechOptions = {}) => {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef<ActiveCapture>(null);
  const onTextRef = useRef(onText);
  const optionsRef = useRef(options);

  onTextRef.current = onText;
  optionsRef.current = options;

  const recognitionCtor = useMemo(getSpeechRecognition, []);
  const provider = options.provider ?? 'browser';
  const browserSupported = Boolean(recognitionCtor);
  const mediaSupported = Boolean(
    typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia,
  );
  const supported = provider === 'browser' ? browserSupported : mediaSupported;
  const secure = typeof window === 'undefined' ? true : window.isSecureContext;

  const stop = useCallback(() => {
    const active = activeRef.current;
    if (!active) {
      return;
    }

    try {
      if (active.kind === 'browser') {
        active.recognition.stop();
      } else {
        active.recorder.stop();
      }
    } catch {
      activeRef.current = null;
      setListening(false);
    }
  }, []);

  const startBrowser = useCallback(() => {
    if (!recognitionCtor) {
      setError('Speech recognition is not supported by this browser.');
      return;
    }
    if (!secure) {
      setError(explainError('', false));
      return;
    }

    const recognition = new recognitionCtor();
    recognition.lang = optionsRef.current.language ?? 'zh-TW';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      let text = '';
      let final = false;
      for (let index = 0; index < event.results.length; index += 1) {
        text += event.results[index][0].transcript;
        final = final || event.results[index].isFinal;
      }
      onTextRef.current(text.trim(), final);
    };
    recognition.onerror = (event) => setError(explainError(event.error ?? 'error', secure));
    recognition.onend = () => {
      activeRef.current = null;
      setListening(false);
    };

    activeRef.current = { kind: 'browser', recognition };
    setError(null);
    setListening(true);
    try {
      recognition.start();
    } catch {
      activeRef.current = null;
      setListening(false);
      setError('Could not start speech recognition.');
    }
  }, [recognitionCtor, secure]);

  const startRecorder = useCallback(async () => {
    if (!mediaSupported) {
      setError('Microphone capture is not supported by this browser.');
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { autoGainControl: false, echoCancellation: false, noiseSuppression: false },
      });
    } catch {
      setError('Microphone access is blocked.');
      return;
    }

    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((candidate) =>
      MediaRecorder.isTypeSupported(candidate),
    );
    const chunks: BlobPart[] = [];
    const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      activeRef.current = null;
      setListening(false);
      const blob = new Blob(chunks, { type: recorder.mimeType || mime || 'audio/webm' });
      if (blob.size === 0) {
        return;
      }

      try {
        const response = await fetch('/api/voice/transcribe', {
          body: blob,
          headers: { 'Content-Type': blob.type },
          method: 'POST',
        });
        if (!response.ok) {
          setError(`Transcription failed (${response.status}).`);
          return;
        }
        const result = (await response.json()) as { text?: string };
        const text = result.text?.trim();
        if (text) {
          onTextRef.current(text, true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Transcription failed.');
      }
    };

    activeRef.current = { kind: 'recorder', recorder, stream };
    setError(null);
    setListening(true);
    recorder.start();
  }, [mediaSupported]);

  const toggle = useCallback(() => {
    if (activeRef.current) {
      stop();
      return;
    }

    if ((optionsRef.current.provider ?? 'browser') === 'browser') {
      startBrowser();
    } else {
      void startRecorder();
    }
  }, [startBrowser, startRecorder, stop]);

  useEffect(
    () => () => {
      const active = activeRef.current;
      if (!active) {
        return;
      }
      try {
        if (active.kind === 'browser') {
          active.recognition.stop();
        } else {
          active.recorder.stop();
          active.stream.getTracks().forEach((track) => track.stop());
        }
      } catch {
        // Ignore teardown races.
      }
    },
    [],
  );

  return { error, listening, supported, toggle };
};

