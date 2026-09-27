import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1050 },
  deviceScaleFactor: 1,
});
page.on("pageerror", (e) => console.log("ERROR", e.message));
await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });
await page.screenshot({
  path: ".frames/workbench-desktop.png",
  fullPage: false,
});
await page.locator("#lab").scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await page.screenshot({ path: ".frames/workbench-lab.png" });
await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => scrollTo(0, 0));
await page.waitForTimeout(500);
await page.screenshot({ path: ".frames/workbench-mobile.png" });
await page.evaluate(() =>
  document
    .querySelectorAll(".pending")
    .forEach((el) => el.classList.remove("pending")),
);
await page.waitForTimeout(800);
await page.screenshot({
  path: ".frames/workbench-mobile-full.png",
  fullPage: true,
});
await page.setViewportSize({ width: 1440, height: 1050 });
await page.locator("#work").scrollIntoViewIfNeeded();
await page.waitForTimeout(700);
await page.screenshot({ path: ".frames/workbench-projects.png" });
await browser.close();
