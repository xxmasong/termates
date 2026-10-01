import { Component, type ErrorInfo, type ReactNode } from 'react';

import { ERROR_BOUNDARY_COPY, STALE_CHUNK_RELOAD_KEY } from '../constants';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Changing this (e.g. the route) clears a caught error. */
  resetKey?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** A lazy chunk that 404s because a deploy replaced its hashed file. */
const isStaleChunk = (error: Error): boolean =>
  /dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(
    `${error.name} ${error.message}`,
  );

/**
 * Catches render errors so one broken view can't blank the whole app. A stale
 * code chunk after a deploy reloads the page once instead of showing an error.
 *
 * A class component: React only supports error boundaries as classes, the one
 * exception to the React.FC convention.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (isStaleChunk(error) && !sessionStorageFlag()) {
      setSessionStorageFlag();
      window.location.reload();
      return;
    }
    console.error('[ui] render error', error, info.componentStack);
  }

  componentDidUpdate(previous: ErrorBoundaryProps): void {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private readonly reload = (): void => window.location.reload();

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <main className="error-boundary" role="alert">
        <h1>{ERROR_BOUNDARY_COPY.title}</h1>
        <p>{ERROR_BOUNDARY_COPY.body}</p>
        <button className="btn btn--primary btn--md" onClick={this.reload} type="button">
          {ERROR_BOUNDARY_COPY.reload}
        </button>
      </main>
    );
  }
}

function sessionStorageFlag(): boolean {
  try {
    return window.sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY) === '1';
  } catch {
    return true; // storage blocked: never risk a reload loop
  }
}

function setSessionStorageFlag(): void {
  try {
    window.sessionStorage.setItem(STALE_CHUNK_RELOAD_KEY, '1');
  } catch {
    /* ignore */
  }
}
