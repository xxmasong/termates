import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import { ConflictError, InvalidInputError } from '../src/storage-errors.js';
import { resolveInside, validateProjectName } from '../src/storage-paths.js';

describe('storage path guards', () => {
  it('rejects unsafe project names', () => {
    for (const bad of [
      '',
      '   ',
      '.',
      '..',
      '../x',
      'a/b',
      'a\\b',
      '.hidden',
      'x\0y',
      'n'.repeat(81),
    ]) {
      assert.throws(() => validateProjectName(bad), InvalidInputError, JSON.stringify(bad));
    }
    assert.equal(validateProjectName('  Shop Redesign  '), 'Shop Redesign');
  });

  it('keeps file paths inside their folder', () => {
    const base = '/srv/shared/shop';
    assert.equal(resolveInside(base, 'notes/plan.md'), '/srv/shared/shop/notes/plan.md');
    for (const bad of [
      '',
      '../x',
      'a/../../x',
      '/etc/passwd',
      'a//b',
      './a',
      '.env',
      'a/.git/x',
      'a\0b',
    ]) {
      assert.throws(() => resolveInside(base, bad), InvalidInputError, JSON.stringify(bad));
    }
    assert.equal(resolveInside(base, 'win\\style.md'), '/srv/shared/shop/win/style.md');
  });
});

describe('storage hardening', () => {
  const saved = { ...process.env };
  let home = '';
  let storage: typeof import('../src/storage.js');

  before(async () => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'termhive-storage-'));
    process.env.HOME = home;
    delete process.env.TERMHIVE_MAX_PROJECTS;
    delete process.env.TERMHIVE_MAX_AGENTS;
    delete process.env.TERMHIVE_LIMITS_FILE;
    storage = await import('../src/storage.js');
  });

  after(() => {
    process.env = saved;
    fs.rmSync(home, { recursive: true, force: true });
  });

  const shared = (name: string) => path.join(home, '.termhive', 'shared_content', name);

  it('refuses duplicate project names, case-insensitively', () => {
    storage.createProject('Shop', path.join(home, 'shop'));
    assert.throws(() => storage.createProject('shop', path.join(home, 'x')), ConflictError);
  });

  it('blocks traversal through shared-content and wiki filenames', () => {
    const [project] = storage.listProjects();
    assert.throws(
      () => storage.createContent(project.id, '../../evil.md', 'x', 'u'),
      InvalidInputError,
    );
    assert.throws(() => storage.getContent(project.id, '../../../.bashrc'), InvalidInputError);
    assert.throws(() => storage.updateWikiFile(project.id, '../x.md', 'x'), InvalidInputError);
    assert.ok(!fs.existsSync(path.join(home, '.termhive', 'evil.md')));
  });

  it('never lets an update overwrite ids', () => {
    const [project] = storage.listProjects();
    const updated = storage.updateProject(project.id, { id: 'hijack', name: 'Shop' } as never);
    assert.equal(updated?.id, project.id);
    const agent = storage.createAgent(project.id, 'Ana', 'claude', path.join(home, 'shop'));
    assert.ok(agent);
    const changed = storage.updateAgent(project.id, agent.id, {
      id: 'x',
      projectId: 'y',
      role: 'qa',
    } as never);
    assert.deepEqual(
      [changed?.id, changed?.projectId, changed?.role],
      [agent.id, project.id, 'qa'],
    );
  });

  it('moves shared files and the wiki along when a project is renamed', () => {
    const [project] = storage.listProjects();
    storage.createContent(project.id, 'plan.md', '# plan', 'u');
    storage.updateProject(project.id, { name: 'Storefront' });
    assert.ok(fs.existsSync(path.join(shared('Storefront'), 'plan.md')));
    assert.ok(!fs.existsSync(shared('Shop')));
    assert.equal(storage.getContent(project.id, 'plan.md')?.content, '# plan');
  });

  it('ignores ids that are not ids and survives a corrupt project file', () => {
    assert.equal(storage.getProjectData('../..'), null);
    const bad = path.join(home, '.termhive', 'projects', 'broken');
    fs.mkdirSync(bad, { recursive: true });
    fs.writeFileSync(path.join(bad, 'project.json'), '{not json');
    assert.equal(storage.listProjects().length, 1);
  });

  it('deletes a project with its data without touching anything else', () => {
    const keep = storage.createProject('Keep', path.join(home, 'keep'));
    storage.createContent(keep.id, 'k.md', 'k', 'u');
    const [first] = storage.listProjects();
    assert.ok(storage.deleteProject(first.id, true));
    assert.ok(!fs.existsSync(shared('Storefront')));
    assert.ok(fs.existsSync(path.join(shared('Keep'), 'k.md')));
  });
});
