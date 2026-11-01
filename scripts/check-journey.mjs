import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { catalog } from '../src/data/catalog.js';
const baseUrl=process.env.GAS_BASE_URL || 'http://127.0.0.1:5173/';
const chrome=process.env.GAS_CHROME_PATH || (existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);
await mkdir('.frames',{recursive:true});
const browser=await chromium.launch({executablePath:chrome,headless:true});
const errors=[];
for(const [name,width,height,reducedMotion] of [['journey-desktop',1440,1000,'no-preference'],['journey-mobile',390,844,'no-preference'],['journey-reduced',320,740,'reduce']]){
  const ctx=await browser.newContext({viewport:{width,height},reducedMotion,hasTouch:width<800});
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(`${name}: ${e.message}`));p.on('console',m=>{if(m.type()==='error')errors.push(`${name}: ${m.text()}`);});
  await p.goto(baseUrl,{waitUntil:'networkidle'});
  await p.waitForFunction(()=>document.querySelector('#loader').hidden);await p.waitForTimeout(1400);
  assert(await p.locator('#hero-image').evaluate(img=>img.complete&&img.naturalWidth>0));
  assert.equal(await p.locator('.project-card').count(),catalog.filter(p=>p.featured!==false).length);assert.equal(await p.locator('.archive-row').count(),catalog.length);
  assert.equal(await p.locator('#open-index [data-repo-count]').innerText(),String(catalog.length));
  assert.equal(await p.locator('.archive-row a[href*="/GMAT"]').count(),0);
  for(const selector of ['#project-daymark img','#project-gmat img']){
    const img=p.locator(selector);await img.scrollIntoViewIfNeeded();
    await p.waitForFunction(el=>el.complete&&el.naturalWidth>0,await img.elementHandle());
  }
  await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(1000);
  assert(await p.evaluate(()=>getComputedStyle(document.body).overflowY!=='hidden'));
  await p.screenshot({path:`.frames/${name}-hero.png`});
  if(reducedMotion==='no-preference'){
    await p.mouse.wheel(0,750);await p.waitForTimeout(1400);
    assert(await p.evaluate(()=>scrollY>100),'Native scroll moves document');
    await p.screenshot({path:`.frames/${name}-opening-motion.png`});
  }
  await p.locator('nav a[href="#work"]').click();await p.waitForTimeout(1600);
  await p.screenshot({path:`.frames/${name}-work.png`});
  const before=await p.evaluate(()=>scrollY);
  await p.locator('#work-next').click();await p.waitForTimeout(1800);
  assert((await p.locator('#work-current').innerText()).startsWith('02'));
  if(width>800&&reducedMotion==='no-preference')assert(await p.evaluate(()=>scrollY)>before,'Vertical input travels horizontally');
  await p.screenshot({path:`.frames/${name}-work-next.png`});
  await p.locator('#project-moneyfest button').click();await p.waitForTimeout(1800);
  assert.equal(await p.locator('#case-select').inputValue(),'moneyfest');
  assert((await p.locator('#case-story').innerText()).includes('deterministic gate'));
  await p.screenshot({path:`.frames/${name}-inside.png`});
  await p.locator('#open-index').click();await p.getByRole('searchbox').fill('Buddy');
  assert.equal(await p.locator('.index-row').count(),1);await p.locator('.index-row').click();await p.waitForTimeout(1500);
  assert.equal(await p.locator('#case-select').inputValue(),'buddy');
  await p.locator('nav a[href="#contact"]').click();await p.waitForTimeout(1800);
  await p.screenshot({path:`.frames/${name}-contact.png`});
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  console.log(`${name}: opening, native scrolling, horizontal work, vertical case studies, index, contact passed`);
  await ctx.close();
}
const ctx=await browser.newContext({javaScriptEnabled:false});const p=await ctx.newPage();await p.goto(baseUrl);assert(await p.locator('h1').isVisible());assert(await p.locator('.no-script a').isVisible());await ctx.close();
await browser.close();assert.deepEqual(errors,[]);console.log('No-JavaScript fallback and zero browser errors passed.');
