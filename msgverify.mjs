import { chromium } from 'playwright';

const B = process.env.BASE ?? 'https://sg1-termhive2.tailfa2e0b.ts.net';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

const errs = [];
const posts = [];
p.on('pageerror', (e) => errs.push('PAGEERROR: ' + String(e).slice(0, 150)));
p.on('console', (m) => {
  if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 150));
});
p.on('response', (r) => {
  if (r.url().includes('/api/') && r.request().method() === 'POST') {
    posts.push(`${r.status()} POST ${r.url().replace(B, '')}`);
  }
});

await p.goto(B, { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(1500);

await p.locator('.project-list-item__select').filter({ hasText: /Sample/ }).first().click();
await p.waitForTimeout(2500);
await p.locator('.tab-bar__tab').filter({ hasText: /Messages/ }).first().click();
await p.waitForTimeout(2500);

const mounted = await p.evaluate(() => {
  const sels = [...document.querySelectorAll('.messages-panel select')];
  return {
    panel: !!document.querySelector('.messages-panel'),
    composer: !!document.querySelector('.messages-panel__composer'),
    selects: sels.map((s) => [...s.options].map((o) => o.textContent.trim())),
    hasInput: !!document.querySelector(
      '.messages-panel__composer input, .messages-panel__composer textarea',
    ),
  };
});
console.log('MOUNT:', JSON.stringify(mounted));

const input = p
  .locator('.messages-panel__composer input, .messages-panel__composer textarea')
  .first();
if ((await input.count()) > 0) {
  await input.fill('Verification ping');
  await p.locator('.messages-panel__composer button').last().click();
  await p.waitForTimeout(3000);
}

const after = await p.evaluate(() => ({
  rows: document.querySelectorAll('.message-event').length,
  text: (document.querySelector('.messages-panel__conversation')?.innerText || '')
    .replace(/\s+/g, ' ')
    .slice(0, 220),
}));
console.log('AFTER SEND:', JSON.stringify(after));
console.log('POSTs:', posts.length ? posts : 'none');
console.log('errors:', errs.length ? errs.slice(0, 2) : 'none');

await p.screenshot({ path: '/tmp/msg-fixed.png' });
await b.close();
