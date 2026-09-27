import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const p=await b.newPage({reducedMotion:'reduce'});
await p.goto('http://127.0.0.1:5173',{waitUntil:'networkidle'});
for(const width of [320,390,600,760,768,1024,1440,1920]){
 await p.setViewportSize({width,height:1000});
 for(const step of [0,1,2,3]){
  await p.locator(`[data-engine-step="${step}"]`).click();
  await p.waitForTimeout(60);
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${width}, ${step}`);
  if(step===3){
   const overlap=await p.evaluate(()=>{const a=document.createRange();a.selectNodeContents(document.querySelector('.cinema-copy h1'));const r=a.getBoundingClientRect(),s=document.querySelector('#product-film').getBoundingClientRect();return r.left<s.right&&r.right>s.left&&r.top<s.bottom&&r.bottom>s.top;});
   assert(!overlap,`Product and title overlap ${width}`);
   const fits=await p.locator('#product-film').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1;});assert(fits,`product clips ${width}`);
  }
 }
}
await p.setViewportSize({width:1440,height:1000});await p.locator('#theme-command button').click();await p.locator('[data-engine-step="0"]').click();await p.screenshot({path:'.frames/film-light-ideas.png'});await p.locator('[data-engine-step="3"]').click();await p.screenshot({path:'.frames/film-light-product.png'});
await b.close();console.log('PASS: all four frames at 320–1920px; no headline/product overlap or horizontal clipping.');
