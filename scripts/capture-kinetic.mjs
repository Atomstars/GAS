import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("pageerror", (e) => console.log("ERROR:", e.message));
await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.screenshot({ path: ".frames/kinetic-light.png" });
await page.locator("#theme-command button").click();
await page.waitForTimeout(1000);
await page.screenshot({ path: ".frames/kinetic-dark.png" });
await page.locator("#theme-input").fill("lights.ultraviolet()");
await page.locator("#theme-command button").click();
await page.waitForTimeout(800);
await page.screenshot({ path: ".frames/kinetic-violet.png" });
await page.locator("#theme-input").fill("lights.on()");
await page.locator("#theme-command button").click();
await page
  .locator("#lab")
  .evaluate((e) => e.scrollIntoView({ block: "start", behavior: "instant" }));
await page.waitForTimeout(1000);
await page
  .locator(".lab-shell")
  .screenshot({ path: ".frames/kinetic-lab.png" });
await page.locator('[data-path="fallback"]').click();
await page.locator('[data-node="3"]').click();
await page
  .locator(".lab-shell")
  .screenshot({ path: ".frames/kinetic-lab-fallback.png" });
await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
await page.waitForTimeout(1000);
await page.screenshot({ path: ".frames/kinetic-mobile.png", fullPage: false });
await page
  .locator("#lab")
  .evaluate((e) => e.scrollIntoView({ block: "start", behavior: "instant" }));
await page.waitForTimeout(1000);
await page
  .locator(".lab-shell")
  .screenshot({ path: ".frames/kinetic-lab-mobile.png" });
await browser.close();
