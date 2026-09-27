import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1050}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174',{waitUntil:'networkidle'});
 await page.screenshot({path:'.frames/home-premium-desktop.png'});
 for(const stage of [1,2,0]) {await page.locator(`[data-stage-button="${stage}"]`).click();assert.equal(await page.locator('#idea-engine').getAttribute('data-stage'),String(stage));}
 await page.locator('#engine-scene').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#idea-engine').getAttribute('data-stage'),'1');
 await page.locator('#engine-scene').click({position:{x:50,y:90}});assert.equal(await page.locator('#idea-engine').getAttribute('data-stage'),'2');
 await page.waitForTimeout(1700);await page.locator('#idea-engine').screenshot({path:'.frames/home-premium-product.png'});
 await page.locator('[data-stage-button="0"]').click();await page.locator('#play-film').click();await page.waitForTimeout(4600);assert.equal(await page.locator('#idea-engine').getAttribute('data-stage'),'1');await page.locator('#play-film').click();
 for(const id of ['moneyfest','buddy','davina']) {await page.locator(`[data-project="${id}"]`).click();assert(await page.locator('#project-dialog').evaluate(el=>el.open));await page.keyboard.press('Escape');}
 for(const width of [360,390,768,1440]) {await page.setViewportSize({width,height:900});await page.evaluate(()=>scrollTo(0,0));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow ${width}`);if(width===390){await page.locator('[data-stage-button="0"]').click();await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(1600);await page.screenshot({path:'.frames/home-premium-mobile.png'});}}
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'true');await page.locator('[data-stage-button="2"]').click();assert.equal(await page.locator('#idea-engine').getAttribute('data-stage'),'2');
 assert.deepEqual(errors,[]);console.log('PASS: keyboard, tap, stages, playback, existing dialogs, reduced motion, four responsive sizes, no browser errors.');
} finally {await browser.close();}
