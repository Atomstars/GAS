import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
for(const [name,url] of Object.entries({silvia:'https://www.silviamalavasi.com/',daq:'https://daqconsulting.com/',launch:'https://launchfar.com/',arc:'https://arc.net/folder/067E6535-20F7-47B4-A130-262501672322',medium:'https://medium.com/design-bootcamp/10-of-the-coolest-websites-for-inspiration-d8b2b35bbc2'})) {
 const p=await b.newPage({viewport:{width:1440,height:1000},ignoreHTTPSErrors:true});
 try {await p.goto(url,{waitUntil:'domcontentloaded',timeout:35000});await p.waitForTimeout(6000);await p.screenshot({path:'.frames/ref-'+name+'.png'});console.log(name, (await p.locator('body').innerText()).slice(0,4000));} catch(e){console.log(name,e.message)}
 await p.close();
}
await b.close();
