import {chromium} from 'playwright';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
const p=await browser.newPage({viewport:{width,height},hasTouch:width<800});p.on('pageerror',e=>console.log(e.message));p.on('console',m=>{if(m.type()==='error')console.log(m.text());});
await p.goto('http://127.0.0.1:5173',{waitUntil:'networkidle'});await p.waitForFunction(()=>document.querySelector('#loader').hidden);
await p.evaluate(()=>window.scrollTo(0,document.querySelector('#matter').getBoundingClientRect().top+scrollY+200));await p.waitForTimeout(1800);await p.screenshot({path:`.frames/matter-${name}.png`});
await p.locator('nav a[href="#work"]').click();await p.waitForTimeout(2200);await p.screenshot({path:`.frames/observatory-${name}.png`});
await p.locator('#project-davina .build-link').click();await p.waitForTimeout(1800);await p.screenshot({path:`.frames/anatomy-${name}.png`});
await p.close();}
await browser.close();
