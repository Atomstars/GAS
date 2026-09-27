import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1050}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173',{waitUntil:'networkidle'});
 await page.screenshot({path:'.frames/company-desktop.png',fullPage:true});
 assert.match(await page.locator('h1').innerText(),/Real-world impact/);
 for(const stage of [1,2,0]) {await page.locator(`[data-stage-button="${stage}"]`).click();assert.equal(await page.locator('#idea-engine').getAttribute('data-stage'),String(stage));}
 await page.locator('#play-film').click();await page.waitForTimeout(4500);assert.equal(await page.locator('#idea-engine').getAttribute('data-stage'),'1');await page.locator('#play-film').click();
 await page.locator('[data-stage-button="2"]').click();await page.waitForTimeout(1600);await page.locator('#idea-engine').screenshot({path:'.frames/company-reality.png'});
 for(const id of ['moneyfest','buddy','davina']) {await page.locator(`[data-project="${id}"]`).click();assert(await page.locator('#project-dialog').evaluate(el=>el.open));assert((await page.locator('#project-detail a').getAttribute('href')).startsWith('https://github.com/'));await page.keyboard.press('Escape');assert.equal(await page.locator('#project-dialog').evaluate(el=>el.open),false);}
 await page.locator('#motion-toggle').click();assert(await page.locator('body').evaluate(el=>el.classList.contains('motion-reduced')));
 for(const width of [360,390,768,1440]) {await page.setViewportSize({width,height:900});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(300);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow at ${width}`);if(width===390)await page.screenshot({path:'.frames/company-mobile.png',fullPage:true});}
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'true');await page.locator('[data-stage-button="2"]').click();assert.equal(await page.locator('#idea-engine').getAttribute('data-stage'),'2');
 assert.deepEqual(errors,[]);
 console.log('PASS: stage controls, playback, project dialogs, Escape, reduced motion, and 360/390/768/1440px layouts. No browser errors.');
} finally {await browser.close();}
