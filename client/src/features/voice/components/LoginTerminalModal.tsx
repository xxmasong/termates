import { FitAddon } from '@xterm/addon-fit';
import { Terminal as XTerminal } from '@xterm/xterm';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import '@xterm/xterm/css/xterm.css';

import { Button, Modal } from '@/components';
import { WS_CLIENT_MESSAGE_TYPES, WS_SERVER_MESSAGE_TYPES } from '@/constants';
import { useWsSend, useWsSubscribe } from '@/lib/ws';

import { voiceKeys } from '../api/voiceKeys';

export interface LoginTerminalModalProps {
  cli: { key: string; label: string } | null;
  onClose: () => void;
}

/** Only links that look like a sign-in page — the CLIs also print docs URLs. */
/* eslint-disable no-control-regex -- terminal output carries BEL/ESC bytes */
const SIGN_IN_URL =
  /https:\/\/[^\s"'<>\x07\x1b]*(?:oauth|authorize|device|accounts\.google)[^\s"'<>\x07\x1b]*(?=\s)/i;

const ANSI =
  /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[()][A-Za-z0-9]|\x1b[=>]/g;
/* eslint-enable no-control-regex */

type Phase = 'running' | 'exited';

/** Claude: "Paste code here if prompted"; Gemini: "Enter the authorization code". */
const CODE_PROMPT = /paste code here|authorization code:/i;

/** Codex device flow prints the one-time code on the line after the prompt. */
const DEVICE_CODE = /one-time code[^\n]*\n\s*([A-Z0-9]{4,6}-[A-Z0-9]{4,6})\b/i;

export const LoginTerminalModal: React.FC<LoginTerminalModalProps> = ({ cli, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const textRef = useRef('');
  const openedRef = useRef(false);
  const [url, setUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('running');
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [needsCode, setNeedsCode] = useState(false);
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const send = useWsSend();
  const queryClient = useQueryClient();

  const open = Boolean(cli);

  useEffect(() => {
    const container = containerRef.current;

    if (!cli || !container) {
      return undefined;
    }

    textRef.current = '';
    openedRef.current = false;
    setUrl(null);
    setPhase('running');
    setExitCode(null);
    setNeedsCode(false);
    setDeviceCode(null);
    setCode('');
    setSubmitted(false);
    setShowTerminal(false);

    const terminal = new XTerminal({
      convertEol: false,
      cursorBlink: true,
      fontFamily: "'Consolas', 'Fira Code', monospace",
      fontSize: 12.5,
      theme: { background: '#1e1e1e', foreground: '#e6edf3' },
    });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(container);
    fit.fit();
    fitRef.current = fit;
    terminalRef.current = terminal;

    send({
      cli: cli.key,
      cols: terminal.cols,
      rows: terminal.rows,
      type: WS_CLIENT_MESSAGE_TYPES.LOGIN_START,
    });

    const inputDisposable = terminal.onData((data) => {
      send({ data, type: WS_CLIENT_MESSAGE_TYPES.LOGIN_INPUT });
    });
    const resizeDisposable = terminal.onResize(({ cols, rows }) => {
      send({ cols, rows, type: WS_CLIENT_MESSAGE_TYPES.LOGIN_RESIZE });
    });
    const observer = new ResizeObserver(() => {
      if (container.clientHeight > 0) {
        fit.fit();
      }
    });
    observer.observe(container);

    return () => {
      send({ type: WS_CLIENT_MESSAGE_TYPES.LOGIN_STOP });
      observer.disconnect();
      inputDisposable.dispose();
      resizeDisposable.dispose();
      terminal.dispose();
      terminalRef.current = null;
      fitRef.current = null;
      // Whatever happened, re-read status so the sidebar reflects it.
      void queryClient.invalidateQueries({ queryKey: voiceKeys.usage() });
    };
  }, [cli, queryClient, send]);

  useWsSubscribe(WS_SERVER_MESSAGE_TYPES.LOGIN_OUTPUT, (message) => {
    terminalRef.current?.write(message.data);

    // Keep a plain-text tail to find the sign-in link and prompts, which may
    // arrive split across several chunks.
    textRef.current = (textRef.current + message.data.replace(ANSI, '')).slice(-8000);

    if (CODE_PROMPT.test(textRef.current)) {
      setNeedsCode(true);
    }

    const device = textRef.current.match(DEVICE_CODE);
    if (device) {
      setDeviceCode(device[1]);
    }

    if (openedRef.current) {
      return;
    }

    const match = textRef.current.match(SIGN_IN_URL);

    if (match) {
      openedRef.current = true;
      setUrl(match[0]);
      // Usually still within the Connect click's user activation, so the tab
      // opens; if the browser blocks it, the button below does the same.
      window.open(match[0], '_blank', 'noopener');
    }
  });

  useWsSubscribe(WS_SERVER_MESSAGE_TYPES.LOGIN_EXIT, (message) => {
    setPhase('exited');
    setExitCode(message.exitCode);
    if (message.exitCode !== 0) {
      setShowTerminal(true);
    }
    terminalRef.current?.write(
      `\r\n\x1b[2m[sign-in process exited with code ${message.exitCode}]\x1b[0m\r\n`,
    );
    void queryClient.invalidateQueries({ queryKey: voiceKeys.usage() });
  });

  const openSignIn = useCallback(() => {
    if (url) {
      window.open(url, '_blank', 'noopener');
    }
  }, [url]);

  const submitCode = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const value = code.trim();

      if (!value) {
        return;
      }

      send({ data: `${value}\r`, type: WS_CLIENT_MESSAGE_TYPES.LOGIN_INPUT });
      setSubmitted(true);
      setCode('');
    },
    [code, send],
  );

  useEffect(() => {
    // xterm can only measure itself once its box is visible again.
    if (showTerminal) {
      requestAnimationFrame(() => fitRef.current?.fit());
    }
  }, [showTerminal]);

  const succeeded = phase === 'exited' && exitCode === 0;

  return (
    <Modal
      closeOnBackdrop={false}
      onClose={onClose}
      open={open}
      title={cli ? `Connect ${cli.label}` : ''}
      width={760}
    >
      <div className="login-terminal">
        {succeeded ? (
          <p className="login-terminal__status login-terminal__status--ok">
            {cli?.label} is signed in. You can close this window.
          </p>
        ) : phase === 'exited' ? (
          <p className="login-terminal__status login-terminal__status--err">
            Sign-in did not finish. See the output below, then try again.
          </p>
        ) : (
          <>
            <div className="login-terminal__step">
              <span className="login-terminal__num">1</span>
              <div className="login-terminal__step-body">
                <span>
                  {cli?.key === 'gemini'
                    ? 'Sign in with your Google account in the browser.'
                    : `Sign in to your ${cli?.label} subscription in the browser.`}
                </span>
                {url ? (
                  <div className="login-terminal__actions">
                    <Button onClick={openSignIn} size="sm" variant="primary">
                      Open sign-in page
                    </Button>
                    <Button
                      onClick={() => void navigator.clipboard?.writeText(url)}
                      size="sm"
                      variant="ghost"
                    >
                      Copy link
                    </Button>
                  </div>
                ) : (
                  <span className="login-terminal__muted">Preparing sign-in link…</span>
                )}
              </div>
            </div>

            {deviceCode ? (
              <div className="login-terminal__step">
                <span className="login-terminal__num">2</span>
                <div className="login-terminal__step-body">
                  <span>Enter this one-time code on that page:</span>
                  <code className="login-terminal__device-code">{deviceCode}</code>
                  <span className="login-terminal__muted">
                    This window updates by itself when you are done.
                  </span>
                </div>
              </div>
            ) : needsCode ? (
              <div className="login-terminal__step">
                <span className="login-terminal__num">2</span>
                <form className="login-terminal__step-body" onSubmit={submitCode}>
                  <label htmlFor="login-code">Paste the code shown after signing in:</label>
                  <div className="login-terminal__code-row">
                    <input
                      autoComplete="off"
                      className="login-terminal__input"
                      id="login-code"
                      onChange={(event) => setCode(event.target.value)}
                      placeholder="Authentication code"
                      spellCheck={false}
                      value={code}
                    />
                    <Button disabled={!code.trim()} size="sm" type="submit" variant="primary">
                      Submit
                    </Button>
                  </div>
                  {submitted ? <span className="login-terminal__muted">Verifying…</span> : null}
                </form>
              </div>
            ) : null}
          </>
        )}

        <button
          className="login-terminal__toggle"
          onClick={() => setShowTerminal((value) => !value)}
          type="button"
        >
          {showTerminal ? '▾ Hide' : '▸ Show'} terminal output
        </button>
        <div
          className={`login-terminal__screen${showTerminal ? '' : ' login-terminal__screen--hidden'}`}
          ref={containerRef}
        />

        <div className="login-terminal__footer">
          <Button onClick={onClose} size="sm" variant="ghost">
            {phase === 'exited' ? 'Close' : 'Cancel'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
