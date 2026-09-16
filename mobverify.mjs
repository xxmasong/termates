import { chromium, devices } from 'playwright';
const B='https://sg1-termhive2.tailfa2e0b.ts.net';
const b=await chromium.launch({args:['--no-sandbox']});
const p=await (await b.newContext({viewport:{width:412,height:915},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:devices['Galaxy S9+'].userAgent})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,90)));
await p.goto(B,{waitUntil:'networkidle',timeout:60000});
await p.waitForTimeout(1500);
const snap=async(tag)=>{await p.screenshot({path:`/tmp/v-${tag}.png`});
  return p.evaluate(()=>{const de=document.documentElement;
    const main=document.querySelector('.app-shell__main')?.getBoundingClientRect();
    return {mainX:Math.round(main?.x??-1),mainW:Math.round(main?.width??-1),
      pageOverflow:de.scrollWidth-de.clientWidth,
      collapsed:(document.querySelector('.sidebar-shell')?.className||'').includes('--collapsed'),
      label:[...document.querySelectorAll('.app-header button')].find(e=>/sidebar/i.test(e.getAttribute('aria-label')||''))?.getAttribute('aria-label')};});};
console.log('closed  ', JSON.stringify(await snap('closed')));
await p.getByLabel(/sidebar/i).first().click(); await p.waitForTimeout(600);
console.log('opened  ', JSON.stringify(await snap('opened')));
const proj=p.locator('.project-list-item__select').first();
if(await proj.count()){await proj.click();await p.waitForTimeout(3500);}
console.log('selected', JSON.stringify(await snap('selected')));
console.log('pageErrors:',errs.length?errs.slice(0,2):'none');
await b.close();
