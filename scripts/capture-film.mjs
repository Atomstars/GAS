import { chromium } from "playwright";
const b = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
p.on("pageerror", (e) => console.log("ERROR", e.message));
await p.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });
await p.waitForTimeout(400);
await p.screenshot({ path: ".frames/film-ideas.png" });
for (const [step, name] of [
  [1, "connect"],
  [2, "intelligence"],
  [3, "product"],
]) {
  await p.locator(`[data-engine-step="${step}"]`).click();
  await p.waitForTimeout(1400);
  await p.screenshot({ path: `.frames/film-${name}.png` });
}
await p.locator('[data-buddy-tab="planner"]').click();
await p.screenshot({ path: ".frames/film-planner.png" });
await p.setViewportSize({ width: 390, height: 1000 });
await p.waitForTimeout(400);
await p.screenshot({ path: ".frames/film-mobile-product.png" });
await p.locator('[data-engine-step="0"]').click();
await p.waitForTimeout(1200);
await p.screenshot({ path: ".frames/film-mobile-ideas.png" });
await b.close();
