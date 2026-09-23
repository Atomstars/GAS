import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('public/work', { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
for (const [name, url] of [['daymark','https://dailybash.vercel.app'], ['gmat','https://gmat-prep-ivory.vercel.app']]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    console.log(name, response.status(), (await page.locator('body').innerText()).slice(0,1800));
    await page.screenshot({ path: `public/work/${name}.jpg`, type: 'jpeg', quality: 88 });
  } catch (error) { console.log(name, error.message); }
  await page.close();
}
await browser.close();
