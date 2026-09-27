import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("pageerror", (e) => console.log("ERROR", e.message));
await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });
await page.screenshot({ path: ".frames/foundry-desktop.png" });
await page
  .locator(".lab-shell")
  .screenshot({ path: ".frames/foundry-lab.png" });
await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
await page.screenshot({ path: ".frames/foundry-mobile.png" });
await page.setViewportSize({ width: 390, height: 1050 });
await page
  .locator(".product-foundry")
  .screenshot({ path: ".frames/foundry-graphic-mobile.png" });
await page
  .locator(".lab-shell")
  .screenshot({ path: ".frames/foundry-lab-mobile.png" });
await browser.close();
