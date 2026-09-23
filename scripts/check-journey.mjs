import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('.frames',{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const errors=[];
for(const [name,width,height,reducedMotion] of [['journey-desktop',1440,1000,'no-preference'],['journey-mobile',390,844,'no-preference'],['journey-reduced',320,740,'reduce']]){
  const ctx=await browser.newContext({viewport:{width,height},reducedMotion,hasTouch:width<800});
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(`${name}: ${e.message}`));p.on('console',m=>{if(m.type()==='error')errors.push(`${name}: ${m.text()}`);});
  await p.goto('http://127.0.0.1:5173',{waitUntil:'networkidle'});
  await p.waitForFunction(()=>document.querySelector('#loader').hidden);await p.waitForTimeout(1400);
  assert(await p.locator('#hero-image').evaluate(img=>img.complete&&img.naturalWidth>0));
  assert.equal(await p.locator('.project-card').count(),11);assert.equal(await p.locator('.archive-row').count(),14);
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
const ctx=await browser.newContext({javaScriptEnabled:false});const p=await ctx.newPage();await p.goto('http://127.0.0.1:5173');assert(await p.locator('h1').isVisible());assert(await p.locator('.no-script a').isVisible());await ctx.close();
await browser.close();assert.deepEqual(errors,[]);console.log('No-JavaScript fallback and zero browser errors passed.');
