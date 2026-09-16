/**
 * transcript.ts — one append-only log of the whole cross-agent conversation.
 *
 * Claude and Codex each hold their own thread and share nothing automatically;
 * the only context that crosses is the text of a `message_agent` call. This is
 * the durable half of the fix: every message, from whoever, is appended here,
 * so an agent can catch up on what it missed and the record outlives both
 * sessions. The live half is the broadcast in server.ts.
 */
import fs from 'fs';
import path from 'path';
import { SHARED_CONTENT_DIR } from './storage.js';

export function transcriptPath(projectName: string): string {
  return path.join(SHARED_CONTENT_DIR, projectName, 'CONVERSATION.md');
}

/** Append one line. Never throws — a failed log must not break a message. */
export function appendTranscript(projectName: string, from: string, to: string, text: string): void {
  try {
    const file = transcriptPath(projectName);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file,
        '# Conversation log\n\n'
        + 'Every message between the user and the agents, in order. Agents keep\n'
        + 'separate threads, so read this to catch up on anything you missed.\n'
        + 'Append-only — do not edit or rewrite earlier entries.\n\n', 'utf8');
    }
    const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    fs.appendFileSync(file, `## ${stamp} — ${from} → ${to}\n\n${text.trim()}\n\n`, 'utf8');
  } catch { /* logging is best-effort */ }
}
