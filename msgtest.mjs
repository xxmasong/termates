import { chromium } from 'playwright';
const B='https://sg1-termhive2.tailfa2e0b.ts.net';
const b=await chromium.launch({args:['--no-sandbox']});
const p=await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
const errs=[],reqs=[];
p.on('pageerror',e=>errs.push('PAGEERROR: '+String(e).slice(0,200)));
p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE: '+m.text().slice(0,200));});
p.on('response',r=>{if(r.url().includes('/api/')&&r.status()>=400)reqs.push(`${r.status()} ${r.url().replace(B,'')}`);});
await p.goto(B,{waitUntil:'networkidle',timeout:60000});
await p.waitForTimeout(1500);
// pick the project that has agents
const proj=p.locator('.project-list-item__select').filter({hasText:/Sample/}).first();
if(await proj.count()){await proj.click();await p.waitForTimeout(2500);}
// open Messages tab
const tab=p.locator('.tab-bar__tab').filter({hasText:/Messages/}).first();
console.log('messages tab found:',await tab.count());
if(await tab.count()){await tab.click();await p.waitForTimeout(2500);}
const info=await p.evaluate(()=>{
  const panel=document.querySelector('.messages-panel');
  return {panelExists:!!panel,
    text:(panel?.innerText||document.body.innerText).replace(/\s+/g,' ').slice(0,300),
    composer:!!document.querySelector('.messages-panel__composer'),
    inputs:[...document.querySelectorAll('.messages-panel input,.messages-panel select,.messages-panel textarea')].map(e=>e.tagName+':'+(e.getAttribute('placeholder')||e.getAttribute('aria-label')||'')),
    rows:document.querySelectorAll('.message-event').length};});
console.log(JSON.stringify(info,null,1));
console.log('API errors:',reqs.length?reqs:'none');
console.log('JS errors:',errs.length?errs.slice(0,3):'none');
await p.screenshot({path:'/tmp/msg.png'});
await b.close();
