import { chromium, devices } from 'playwright';
const SITES = {
  v1: 'https://sg1-termhive.tailfa2e0b.ts.net',
  v2: 'https://sg1-termhive2.tailfa2e0b.ts.net',
};
const b = await chromium.launch({ args: ['--no-sandbox'] });
for (const [tag, url] of Object.entries(SITES)) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0,120)));
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `/tmp/cmp-${tag}-desktop.png` });
  const info = await p.evaluate(() => ({
    title: document.title,
    theme: document.documentElement.getAttribute('data-theme'),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    font: getComputedStyle(document.body).fontFamily.split(',')[0],
    fontSize: getComputedStyle(document.body).fontSize,
    // top-level structure
    topClasses: [...document.querySelectorAll('#root > * , #root > * > *')].map(e=>e.className).filter(Boolean).slice(0,12),
    tabs: [...document.querySelectorAll('[role="tab"], .tab-bar button, nav button')].map(e=>e.textContent.trim()).filter(Boolean).slice(0,12),
    buttons: [...document.querySelectorAll('button')].map(e=>e.getAttribute('aria-label')||e.textContent.trim()).filter(Boolean).slice(0,20),
    headings: [...document.querySelectorAll('h1,h2,h3')].map(e=>e.textContent.trim()).slice(0,8),
  }));
  console.log(`\n===== ${tag.toUpperCase()} (${url}) =====`);
  console.log(JSON.stringify(info, null, 1));
  if (errs.length) console.log('ERRORS:', errs.slice(0,3));
  await ctx.close();
}
await b.close();
