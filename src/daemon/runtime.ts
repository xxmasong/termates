/**
 * runtime.ts — routes agent operations to the right runtime.
 *
 *   Claude / Codex / Gemini → PTY (pty-manager)
 *
 * Every CLI runs as a real terminal process. Codex used to run as a thread
 * inside a shared `codex app-server`, which rendered as a structured chat
 * transcript rather than a terminal; it now uses its interactive TUI like the
 * others, so all three panes look and behave the same.
 *
 * The daemon and the Hive dispatch layer talk only to this module, so they
 * never branch on CLI themselves.
 */

import * as pty from '../pty-manager.js';
import type { Agent } from '../types.js';
import type { CodexItem } from './protocol.js';

type StatusFn = (agentId: string, status: string) => void;

export async function startAgent(agent: Agent, onStatus: StatusFn): Promise<boolean> {
  return pty.startAgent(agent, onStatus);
}

/** Kept for call sites that still ask; no agent runs on the app-server now. */
export function isCodexAgent(_agentId: string): boolean {
  return false;
}

export function stopAgent(agentId: string): boolean {
  return pty.stopAgent(agentId);
}

export function writeToAgent(agentId: string, data: string): void {
  pty.writeToAgent(agentId, data);
}

export function injectMessage(agentId: string, fromName: string, message: string): boolean {
  return pty.injectMessage(agentId, fromName, message);
}

export function resizeAgent(agentId: string, cols: number, rows: number): void {
  pty.resizeAgent(agentId, cols, rows);
}

/**
 * Attach to an agent's live output. Every agent streams terminal text now;
 * `onItem` is retained in the handler shape so the websocket layer keeps
 * compiling, but it is never called. Returns a teardown function.
 */
export function attach(
  agentId: string,
  handlers: { onText: (data: string) => void; onItem: (item: CodexItem) => void },
): () => void {
  pty.addOutputListener(agentId, handlers.onText);
  return () => pty.removeOutputListener(agentId, handlers.onText);
}

export function getAgentPreview(agentId: string): string {
  return pty.getAgentPreview(agentId);
}

export function isAgentRunning(agentId: string): boolean {
  return pty.isAgentRunning(agentId);
}

export function getRunningAgentIds(): string[] {
  return pty.getRunningAgentIds();
}

/** MCP config cleanup on agent deletion (pty-manager owns both CLIs' configs). */
export function cleanupMcpConfig(agent: Agent): void {
  pty.cleanupMcpConfig(agent);
}

