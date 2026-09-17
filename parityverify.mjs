/*
 * Parity verification: does the Terminals tab now render v1's pane chrome?
 * Starts the agents first — pane chrome for a stopped agent is not the
 * interesting case, and v1's screenshot shows them running.
 */
import { chromium } from 'playwright';

const B = process.env.BASE ?? 'https://sg1-termhive2.tailfa2e0b.ts.net';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();

const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR: ' + String(e).slice(0, 160)));
p.on('console', (m) => m.type() === 'error' && errs.push('CONSOLE: ' + m.text().slice(0, 160)));

await p.goto(B, { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(1200);
await p.locator('.project-list-item__select').filter({ hasText: /Sample/ }).first().click();
await p.waitForTimeout(2500);

// G2: bulk controls must exist on the Terminals tab.
const actions = await p.evaluate(() =>
  [...document.querySelectorAll('button')]
    .map((x) => x.textContent.trim())
    .filter((t) => /Start all|Stop all|New agent|Command/.test(t)),
);
console.log('TABBAR ACTIONS:', JSON.stringify(actions));

// G3: count badge on Terminals.
const tabs = await p.evaluate(() =>
  [...document.querySelectorAll('.tab-bar__tab')].map((t) => t.innerText.replace(/\s+/g, ' ').trim()),
);
console.log('TABS:', JSON.stringify(tabs));

// Bring the agents up so panes render live chrome.
const startAll = p.locator('button').filter({ hasText: /^Start all$/ }).first();
if ((await startAll.count()) > 0 && (await startAll.isEnabled())) {
  await startAll.click();
  await p.waitForTimeout(9000);
}

// G1: pane chrome.
const panes = await p.evaluate(() =>
  [...document.querySelectorAll('.agent-pane')].map((el) => ({
    avatar: el.querySelector('.agent-pane__avatar')?.textContent?.trim() ?? null,
    name: el.querySelector('.agent-pane__name')?.textContent?.trim() ?? null,
    role: el.querySelector('.agent-pane__role')?.textContent?.trim() ?? null,
    meta: el.querySelector('.agent-pane__cwd, .agent-pane__meta')?.textContent?.trim() ?? null,
    status: el.querySelector('.agent-pane__status, .status-chip')?.textContent?.trim() ?? null,
    buttons: el.querySelectorAll('.agent-pane__head button').length,
  })),
);
console.log('PANES:', JSON.stringify(panes, null, 1));
console.log('errors:', errs.length ? errs.slice(0, 3) : 'none');

await p.screenshot({ path: '/tmp/parity-v2.png' });
await b.close();
