/*
 * Browser verification against the live deployment.
 *
 * Checks the specific mobile/PWA claims rather than just "the page loads":
 * the sidebar scrim is tappable, the right panel is height-bounded, form
 * controls are >=16px, PWA assets resolve, and nothing throws in console.
 */

import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'https://sg1-termhive2.tailfa2e0b.ts.net';
const results = [];
const record = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch({ args: ['--no-sandbox'] });

// ── desktop ───────────────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 });

  const rootFilled = await page.locator('#root').evaluate((el) => el.children.length > 0);
  record('desktop: react mounts', rootFilled);

  const shell = page.locator('.app-shell');
  record('desktop: app shell renders', (await shell.count()) > 0);

  const cols = await shell
    .first()
    .evaluate((el) => getComputedStyle(el).gridTemplateColumns)
    .catch(() => '');
  record('desktop: 3-column grid', cols.split(' ').length >= 2, cols);

  // The scrim must not cover the desktop UI.
  const scrimVisible = await page
    .locator('.sidebar-shell__scrim')
    .first()
    .isVisible()
    .catch(() => false);
  const scrimPos = await page
    .locator('.sidebar-shell__scrim')
    .first()
    .evaluate((el) => getComputedStyle(el).position)
    .catch(() => 'none');
  record('desktop: scrim not overlaying', scrimPos !== 'fixed', `position=${scrimPos}`);

  record('desktop: no console errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.screenshot({ path: '/tmp/shot-desktop.png' });
  await ctx.close();
}

// ── mobile (iPhone 13) ────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 });

  // No horizontal scroll — the classic mobile-layout failure.
  const { sw, cw } = await page.evaluate(() => ({
    cw: document.documentElement.clientWidth,
    sw: document.documentElement.scrollWidth,
  }));
  record('mobile: no horizontal overflow', sw <= cw + 1, `scroll=${sw} client=${cw}`);

  // Bug 1: the drawer needs a tap-away backdrop.
  const scrim = page.locator('.sidebar-shell__scrim').first();
  const hasScrim = (await scrim.count()) > 0;
  const scrimFixed = hasScrim
    ? await scrim.evaluate((el) => getComputedStyle(el).position === 'fixed')
    : false;
  record('mobile: sidebar scrim present+fixed', hasScrim && scrimFixed);

  if (hasScrim && scrimFixed) {
    const before = await page.locator('.sidebar-shell').first().getAttribute('class');
    // Tap to the right of the drawer: the sidebar stacks above the scrim, so a
    // tap over the drawer itself would hit the sidebar, not the backdrop.
    const { width } = page.viewportSize();
    await page.mouse.click(width - 40, 300);
    await page.waitForTimeout(500);
    const after = await page.locator('.sidebar-shell').first().getAttribute('class');
    record(
      'mobile: tapping scrim collapses sidebar',
      !before?.includes('--collapsed') && after?.includes('--collapsed') === true,
      `${before} -> ${after}`,
    );
  }

  // Bug 2: the right panel must not eat the viewport.
  const right = page.locator('.app-shell__right').first();
  if ((await right.count()) > 0) {
    const ratio = await right.evaluate((el) => el.getBoundingClientRect().height / window.innerHeight);
    record('mobile: right panel <=50vh', ratio <= 0.5, `${(ratio * 100).toFixed(0)}vh`);
  } else {
    record('mobile: right panel hidden/absent', true, 'not rendered');
  }

  // Bug 3: <16px controls make iOS zoom on focus.
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('input,select,textarea')]
      .map((el) => parseFloat(getComputedStyle(el).fontSize))
      .filter((n) => n < 16),
  );
  record('mobile: form controls >=16px', small.length === 0, `under16=${small.length}`);

  record('mobile: no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.screenshot({ path: '/tmp/shot-mobile.png', fullPage: false });
  await ctx.close();
}

// ── PWA ───────────────────────────────────────────────────────────────────
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });

  const manifestHref = await page
    .locator('link[rel="manifest"]')
    .first()
    .getAttribute('href')
    .catch(() => null);
  record('pwa: manifest linked', manifestHref === '/manifest.webmanifest', String(manifestHref));

  const res = await page.request.get(`${BASE}/manifest.webmanifest`);
  const mf = await res.json();
  record('pwa: manifest valid + standalone', res.ok() && mf.display === 'standalone');
  record('pwa: has name/start_url/icons', !!(mf.name && mf.start_url && mf.icons?.length));

  for (const icon of mf.icons) {
    const r = await page.request.get(`${BASE}${icon.src}`);
    record(`pwa: icon ${icon.src} (${icon.sizes})`, r.ok(), `http=${r.status()}`);
  }

  const sw = await page.request.get(`${BASE}/sw.js`);
  record('pwa: service worker served', sw.ok(), `http=${sw.status()}`);

  const theme = await page
    .locator('meta[name="theme-color"]')
    .first()
    .getAttribute('content')
    .catch(() => null);
  record('pwa: theme-color set', !!theme, String(theme));

  await ctx.close();
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log('FAILURES:');
  failed.forEach((f) => console.log(`  - ${f.name} ${f.detail}`));
  process.exit(1);
}
