import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';

import { appHomeDir, appHomePath } from '../src/app-home.js';

describe('app home', () => {
  const saved = process.env.HOME;
  const homes: string[] = [];
  const freshHome = () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'termates-home-'));
    homes.push(home);
    process.env.HOME = home;
    return home;
  };

  after(() => {
    process.env.HOME = saved;
    for (const home of homes) fs.rmSync(home, { recursive: true, force: true });
  });

  it('moves a pre-rename ~/.termhive to ~/.termates', () => {
    const home = freshHome();
    fs.mkdirSync(path.join(home, '.termhive', 'projects'), { recursive: true });
    fs.writeFileSync(path.join(home, '.termhive', 'activity.jsonl'), 'x');

    assert.equal(appHomeDir(), path.join(home, '.termates'));
    assert.equal(fs.readFileSync(appHomePath('activity.jsonl'), 'utf-8'), 'x');
    assert.ok(fs.existsSync(appHomePath('projects')));
    assert.ok(!fs.existsSync(path.join(home, '.termhive')));
  });

  it('leaves both alone when ~/.termates already exists', () => {
    const home = freshHome();
    fs.mkdirSync(path.join(home, '.termhive'));
    fs.mkdirSync(path.join(home, '.termates'));

    appHomeDir();
    assert.ok(fs.existsSync(path.join(home, '.termhive')));
  });

  it('does not create anything in a new home', () => {
    const home = freshHome();
    assert.equal(appHomePath('brain'), path.join(home, '.termates', 'brain'));
    assert.deepEqual(fs.readdirSync(home), []);
  });
});
