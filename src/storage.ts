import fs from 'fs';
import path from 'path';
import { randomUUID as uuid } from 'crypto';
import type { Project, Agent, ProjectData, SharedContent } from './types.js';
import { assertCanCreate, assertCwdAllowed } from './workspace-limits.js';
import { ConflictError, InvalidInputError } from './storage-errors.js';
import { isSafeId, resolveInside, validateProjectName } from './storage-paths.js';

const BASE_DIR = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.termhive');
const PROJECTS_DIR = path.join(BASE_DIR, 'projects');

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function projectDir(projectId: string) {
  return path.join(PROJECTS_DIR, projectId);
}

function projectFile(projectId: string) {
  return path.join(projectDir(projectId), 'project.json');
}

const SHARED_CONTENT_DIR = path.join(BASE_DIR, 'shared_content');
const WIKI_DIR = path.join(BASE_DIR, 'wiki');

/** `root/<name>`, refusing names that would resolve onto or outside `root`. */
function namedDir(root: string, projectName: string): string {
  const dir = path.resolve(root, projectName);
  if (!dir.startsWith(path.resolve(root) + path.sep)) {
    throw new InvalidInputError('Project name is not usable as a folder name.');
  }
  return dir;
}

function sharedDir(projectName: string) {
  return namedDir(SHARED_CONTENT_DIR, projectName);
}

function wikiDir(projectName: string) {
  return namedDir(WIKI_DIR, projectName);
}

/** Write via a temp file + rename so readers never see a half-written file. */
function writeFileAtomic(file: string, content: string) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, content, 'utf-8');
  fs.renameSync(tmp, file);
}

/** Project names double as folder names, so they must be unique (case-insensitive). */
function assertNameAvailable(name: string, exceptId?: string) {
  const taken = listProjects().some(
    (p) => p.id !== exceptId && p.name.toLowerCase() === name.toLowerCase(),
  );
  if (taken) throw new ConflictError(`A project named "${name}" already exists.`);
}

const PROJECT_UPDATE_KEYS = ['name', 'description', 'cwd'] as const;
const AGENT_UPDATE_KEYS = [
  'name', 'role', 'cli', 'cwd', 'status', 'pid', 'flags',
  'model', 'effort', 'thinking', 'permissionMode', 'autocompact',
] as const;

/** Keep only whitelisted keys — REST bodies must never overwrite ids. */
function pick<T extends object, K extends keyof T>(source: unknown, keys: readonly K[]): Partial<Pick<T, K>> {
  const out: Partial<Pick<T, K>> = {};
  if (!source || typeof source !== 'object') return out;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      out[key] = (source as T)[key];
    }
  }
  return out;
}

// Initialize storage
ensureDir(PROJECTS_DIR);

// --- Projects ---

export function listProjects(): Project[] {
  if (!fs.existsSync(PROJECTS_DIR)) return [];
  const dirs = fs.readdirSync(PROJECTS_DIR);
  const projects: Project[] = [];
  for (const dir of dirs) {
    const file = path.join(PROJECTS_DIR, dir, 'project.json');
    if (!fs.existsSync(file)) continue;
    try {
      const data: ProjectData = JSON.parse(fs.readFileSync(file, 'utf-8'));
      projects.push(data.project);
    } catch (err) {
      // One corrupt project file must not take down the whole list.
      console.error(`[storage] skipping unreadable ${file}:`, err);
    }
  }
  return projects.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getProjectData(projectId: string): ProjectData | null {
  if (typeof projectId !== 'string' || !isSafeId(projectId)) return null;
  const file = projectFile(projectId);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (err) {
    console.error(`[storage] unreadable ${file}:`, err);
    return null;
  }
}

function saveProjectData(data: ProjectData) {
  ensureDir(projectDir(data.project.id));
  writeFileAtomic(projectFile(data.project.id), JSON.stringify(data, null, 2));
}

/** Agents across every project — plan limits count them all. */
export function countAllAgents(): number {
  return listProjects().reduce((total, p) => total + listAgents(p.id).length, 0);
}

/** Throws PlanLimitError when the plan has no room for another project. */
export function assertCanCreateProject(): void {
  assertCanCreate('project', listProjects().length);
}

/** Throws PlanLimitError when the plan has no room for another agent. */
export function assertCanCreateAgent(): void {
  assertCanCreate('agent', countAllAgents());
}

export function createProject(rawName: string, cwd: string, description?: string): Project {
  const name = validateProjectName(rawName);
  assertCwdAllowed(cwd);
  assertCanCreateProject();
  assertNameAvailable(name);
  const project: Project = {
    id: uuid(),
    name,
    description,
    cwd,
    createdAt: new Date().toISOString(),
  };
  saveProjectData({ project, agents: [] });
  // Auto-init shared content + wiki
  ensureDir(sharedDir(name));
  initializeWiki(project.id);
  return project;
}

export function updateProject(projectId: string, rawUpdates: Partial<Pick<Project, 'name' | 'description' | 'cwd'>>): Project | null {
  const data = getProjectData(projectId);
  if (!data) return null;
  const updates = pick<Project, (typeof PROJECT_UPDATE_KEYS)[number]>(rawUpdates, PROJECT_UPDATE_KEYS);
  if (typeof updates.cwd === 'string') assertCwdAllowed(updates.cwd);
  const oldName = data.project.name;
  if (updates.name !== undefined) {
    updates.name = validateProjectName(updates.name);
    assertNameAvailable(updates.name, projectId);
  }
  Object.assign(data.project, updates);
  saveProjectData(data);
  // Shared content and the wiki live in folders named after the project.
  if (updates.name && updates.name !== oldName) {
    for (const dirOf of [sharedDir, wikiDir]) {
      const from = dirOf(oldName);
      const to = dirOf(updates.name);
      if (fs.existsSync(from) && !fs.existsSync(to)) fs.renameSync(from, to);
    }
  }
  return data.project;
}

export function deleteProject(projectId: string, removeData?: boolean): boolean {
  const data = getProjectData(projectId);
  if (!data) return false;

  // Remove shared content and wiki if requested
  // Only when no other project shares the folder name (legacy duplicates), and
  // never for a name that doesn't resolve to its own folder.
  const shared = listProjects().some(
    (p) => p.id !== projectId && p.name.toLowerCase() === data.project.name.toLowerCase(),
  );
  if (removeData && !shared) {
    for (const dirOf of [sharedDir, wikiDir]) {
      try {
        const dir = dirOf(data.project.name);
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
      } catch (err) {
        if (!(err instanceof InvalidInputError)) throw err;
      }
    }
  }

  const dir = projectDir(projectId);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
  return true;
}

// --- Agents ---

export function listAgents(projectId: string): Agent[] {
  const data = getProjectData(projectId);
  return data?.agents ?? [];
}

export function getAgent(projectId: string, agentId: string): Agent | null {
  const data = getProjectData(projectId);
  return data?.agents.find(a => a.id === agentId) ?? null;
}

export function createAgent(projectId: string, name: string, cli: Agent['cli'], cwd: string, role?: string, flags?: Agent['flags']): Agent | null {
  const data = getProjectData(projectId);
  if (!data) return null;
  assertCwdAllowed(cwd);
  assertCanCreateAgent();
  const agent: Agent = {
    id: uuid(),
    projectId,
    name,
    role,
    cli,
    cwd,
    status: 'stopped',
    flags,
  };
  data.agents.push(agent);
  saveProjectData(data);
  return agent;
}

export function updateAgent(projectId: string, agentId: string, updates: Partial<Pick<Agent, 'name' | 'role' | 'cli' | 'cwd' | 'status' | 'pid' | 'flags' | 'model' | 'effort' | 'thinking' | 'permissionMode' | 'autocompact'>>): Agent | null {
  const data = getProjectData(projectId);
  if (!data) return null;
  const agent = data.agents.find(a => a.id === agentId);
  if (!agent) return null;
  const safe = pick<Agent, (typeof AGENT_UPDATE_KEYS)[number]>(updates, AGENT_UPDATE_KEYS);
  if (typeof safe.cwd === 'string') assertCwdAllowed(safe.cwd);
  Object.assign(agent, safe);
  saveProjectData(data);
  return agent;
}

export function deleteAgent(projectId: string, agentId: string): boolean {
  const data = getProjectData(projectId);
  if (!data) return false;
  const idx = data.agents.findIndex(a => a.id === agentId);
  if (idx === -1) return false;
  data.agents.splice(idx, 1);
  saveProjectData(data);
  return true;
}

// --- Shared Content (stored in ~/.termhive/shared_content/[project_name]/) ---

export function listContent(projectId: string): SharedContent[] {
  const data = getProjectData(projectId);
  if (!data) return [];
  const dir = sharedDir(data.project.name);
  if (!fs.existsSync(dir)) return [];
  // Recurse into subdirectories so nested files are listed with relative paths.
  // Filenames are normalized to forward-slashes for cross-platform consistency.
  const results: SharedContent[] = [];
  const readDir = (d: string, prefix: string) => {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const relative = prefix ? prefix + '/' + entry.name : entry.name;
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) {
        readDir(fullPath, relative);
      } else if (entry.isFile()) {
        try {
          const stat = fs.statSync(fullPath);
          const content = fs.readFileSync(fullPath, 'utf-8');
          results.push({
            id: relative,
            projectId,
            filename: relative,
            content,
            createdBy: 'user',
            updatedAt: stat.mtime.toISOString(),
          });
        } catch {
          // skip unreadable entries (permission denied, binary, etc.)
        }
      }
    }
  };
  readDir(dir, '');
  return results;
}

export function getContent(projectId: string, filename: string): SharedContent | null {
  const data = getProjectData(projectId);
  if (!data) return null;
  const filePath = resolveInside(sharedDir(data.project.name), filename);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null;
  const stat = fs.statSync(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  return {
    id: filename,
    projectId,
    filename,
    content,
    createdBy: 'user',
    updatedAt: stat.mtime.toISOString(),
  };
}

export function createContent(projectId: string, filename: string, content: string, _createdBy: string): SharedContent | null {
  const data = getProjectData(projectId);
  if (!data) return null;
  const dir = sharedDir(data.project.name);
  ensureDir(dir);
  const filePath = resolveInside(dir, filename);
  // Support nested filenames like "subfolder/file.md" by ensuring parent dir exists
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf-8');
  const stat = fs.statSync(filePath);
  return {
    id: filename,
    projectId,
    filename,
    content,
    createdBy: _createdBy,
    updatedAt: stat.mtime.toISOString(),
  };
}

export function updateContent(projectId: string, filename: string, content: string): SharedContent | null {
  const data = getProjectData(projectId);
  if (!data) return null;
  const filePath = resolveInside(sharedDir(data.project.name), filename);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null;
  fs.writeFileSync(filePath, content, 'utf-8');
  const stat = fs.statSync(filePath);
  return {
    id: filename,
    projectId,
    filename,
    content,
    createdBy: 'user',
    updatedAt: stat.mtime.toISOString(),
  };
}

export function deleteContent(projectId: string, filename: string): boolean {
  const data = getProjectData(projectId);
  if (!data) return false;
  const filePath = resolveInside(sharedDir(data.project.name), filename);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;
  fs.unlinkSync(filePath);
  return true;
}

// --- Project Wiki (stored in ~/.termhive/memory/[project_name]/) ---

const WIKI_SCHEMA = `# Project Wiki Schema

## Purpose
This is the project's persistent knowledge base, maintained by AI agents via Termhive.
It accumulates and organizes knowledge over time — architecture decisions, API specs,
progress tracking, and cross-referenced documentation.

## Structure

### Core Pages
- **overview.md** — Project purpose, tech stack, current state. The "executive summary" — always keep under 200 lines.
- **architecture.md** — System design, components, data flow, infrastructure.
- **api-endpoints.md** — All API endpoints with request/response formats.
- **data-model.md** — Database schema, models, relationships.
- **decisions.md** — Architecture and design decisions with rationale. Append-only — never delete entries.
- **progress.md** — What's done, what's in progress, what's blocked.

### Agent Logs
- **agents/[agent-name].md** — Per-agent work log: what this agent has accomplished, current focus, blockers.

### Raw Sources (optional)
- **raw/** — Original documents, specs, or references. Immutable — agents read but never modify these.

## Maintenance Rules

When asked to "update wiki" or "write to wiki":

1. Read \`_index.md\` first to find relevant existing pages
2. Update ALL affected pages, not just one. A single change might touch 3-5 pages.
3. Add \`[[cross-references]]\` to related pages using markdown links
4. Always append an entry to \`_log.md\` with format: \`## [YYYY-MM-DD] action | Summary\`
5. Update \`_index.md\` if you created or deleted pages
6. Never delete content from \`decisions.md\` — only append
7. When new information contradicts existing content, note the contradiction and update

## Operations

### Ingest
When processing new information: read it, extract key points, update relevant pages,
add cross-references, update index, append to log.

### Query
When answering questions about the project: read \`_index.md\` first, then drill into
relevant pages. Cite which pages you referenced.

### Lint
Periodically check for: contradictions between pages, stale information, orphan pages
with no inbound links, important concepts missing their own page, gaps that need filling.
`;

const WIKI_INDEX = `# Project Wiki Index

> Auto-maintained by AI agents. See \`_schema.md\` for conventions.

## Core
- [Overview](overview.md) — Project purpose, tech stack, current state
- [Architecture](architecture.md) — System design and components
- [API Endpoints](api-endpoints.md) — REST/GraphQL endpoint reference
- [Data Model](data-model.md) — Database schema and relationships
- [Decisions](decisions.md) — Architecture decision records
- [Progress](progress.md) — Current status and roadmap

## Agents
<!-- Agent pages will be listed here as they are created -->
`;

const WIKI_LOG = `# Project Wiki Log

> Chronological record of wiki updates. Append-only.
> Format: ## [YYYY-MM-DD] action | Summary

`;

const WIKI_OVERVIEW = `# Project Overview

> This page should be the first thing a new agent reads to understand the project.
> Keep it under 200 lines. Update it as the project evolves.

## Purpose
<!-- What does this project do? Who is it for? -->

## Tech Stack
<!-- Languages, frameworks, databases, infrastructure -->

## Current State
<!-- What's working? What's in progress? What's the immediate priority? -->

## Key Links
<!-- Repository, deployment, documentation, etc. -->
`;

export function isWikiInitialized(projectId: string): boolean {
  const data = getProjectData(projectId);
  if (!data) return false;
  const dir = wikiDir(data.project.name);
  return fs.existsSync(path.join(dir, '_schema.md'));
}

export function initializeWiki(projectId: string): boolean {
  const data = getProjectData(projectId);
  if (!data) return false;
  const dir = wikiDir(data.project.name);
  ensureDir(dir);
  ensureDir(path.join(dir, 'agents'));
  ensureDir(path.join(dir, 'raw'));

  const files: Record<string, string> = {
    '_schema.md': WIKI_SCHEMA,
    '_index.md': WIKI_INDEX,
    '_log.md': WIKI_LOG,
    'overview.md': WIKI_OVERVIEW,
    'architecture.md': [
      '# Architecture',
      '',
      '## System Overview',
      '<!-- High-level description: what are the main components and how do they interact? -->',
      '',
      '## Component Diagram',
      '```',
      '┌──────────┐     ┌──────────┐     ┌──────────┐',
      '│ Frontend  │────>│ Backend  │────>│ Database │',
      '└──────────┘     └──────────┘     └──────────┘',
      '```',
      '<!-- Replace with your actual architecture -->',
      '',
      '## Components',
      '',
      '### Frontend',
      '<!-- Framework, structure, key patterns -->',
      '',
      '### Backend',
      '<!-- Framework, API layer, business logic -->',
      '',
      '### Database',
      '<!-- Type, schema overview, key tables -->',
      '',
      '## Data Flow',
      '<!-- How does data flow through the system? Key request paths? -->',
      '',
      '## Infrastructure',
      '<!-- Hosting, CI/CD, environment setup -->',
      '',
    ].join('\n'),
    'api-endpoints.md': [
      '# API Endpoints',
      '',
      '## Base URL',
      '<!-- e.g. http://localhost:3000/api -->',
      '',
      '## Endpoints',
      '',
      '| Method | Path | Description | Auth |',
      '|--------|------|-------------|------|',
      '| GET | /example | Description | No |',
      '| POST | /example | Description | Yes |',
      '',
      '## Authentication',
      '<!-- How does auth work? Token format? -->',
      '',
      '## Error Format',
      '<!-- Standard error response structure -->',
      '',
    ].join('\n'),
    'data-model.md': [
      '# Data Model',
      '',
      '## Entity Relationship',
      '<!-- Key entities and their relationships -->',
      '',
      '## Models',
      '',
      '### Example Model',
      '| Field | Type | Description |',
      '|-------|------|-------------|',
      '| id | string | Primary key |',
      '| created_at | datetime | Creation timestamp |',
      '',
      '## Migrations',
      '<!-- Notable migration history -->',
      '',
    ].join('\n'),
    'decisions.md': [
      '# Architecture Decisions',
      '',
      '> Append-only — never delete entries. New decisions go at the bottom.',
      '',
      '<!-- Template for new entries:',
      '## [YYYY-MM-DD] Decision Title',
      '**Context:** Why did this come up?',
      '**Decision:** What did we choose?',
      '**Alternatives considered:** What else was on the table?',
      '**Rationale:** Why this over the alternatives?',
      '-->',
      '',
    ].join('\n'),
    'progress.md': [
      '# Progress',
      '',
      '> Updated by agents when tasks are completed or started.',
      '> Move items between sections as status changes.',
      '',
      '## Done',
      '<!-- - [YYYY-MM-DD] What was completed -->',
      '',
      '## In Progress',
      '<!-- - What is currently being worked on (and by which agent) -->',
      '',
      '## Blocked',
      '<!-- - What is stuck and why -->',
      '',
      '## Upcoming',
      '<!-- - What needs to be done next -->',
      '',
    ].join('\n'),
  };

  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.join(dir, filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
  }
  return true;
}

export function listWikiFiles(projectId: string): SharedContent[] {
  const data = getProjectData(projectId);
  if (!data) return [];
  const dir = wikiDir(data.project.name);
  if (!fs.existsSync(dir)) return [];

  const results: SharedContent[] = [];
  const readDir = (d: string, prefix: string) => {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (entry.isDirectory()) {
        const sub = prefix ? prefix + '/' + entry.name : entry.name;
        readDir(path.join(d, entry.name), sub);
      } else {
        const filePath = path.join(d, entry.name);
        const filename = prefix ? prefix + '/' + entry.name : entry.name;
        const stat = fs.statSync(filePath);
        results.push({
          id: filename,
          projectId,
          filename,
          content: '',
          createdBy: 'system',
          updatedAt: stat.mtime.toISOString(),
        });
      }
    }
  };
  readDir(dir, '');
  return results;
}

export function getWikiFile(projectId: string, filename: string): SharedContent | null {
  const data = getProjectData(projectId);
  if (!data) return null;
  const filePath = resolveInside(wikiDir(data.project.name), filename);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null;
  const stat = fs.statSync(filePath);
  return {
    id: filename,
    projectId,
    filename,
    content: fs.readFileSync(filePath, 'utf-8'),
    createdBy: 'system',
    updatedAt: stat.mtime.toISOString(),
  };
}

export function updateWikiFile(projectId: string, filename: string, content: string): SharedContent | null {
  const data = getProjectData(projectId);
  if (!data) return null;
  const filePath = resolveInside(wikiDir(data.project.name), filename);
  const dir = path.dirname(filePath);
  ensureDir(dir);
  fs.writeFileSync(filePath, content, 'utf-8');
  const stat = fs.statSync(filePath);
  return {
    id: filename,
    projectId,
    filename,
    content,
    createdBy: 'user',
    updatedAt: stat.mtime.toISOString(),
  };
}

export { SHARED_CONTENT_DIR, WIKI_DIR };
