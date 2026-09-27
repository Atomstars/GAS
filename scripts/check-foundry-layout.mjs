import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const p = await browser.newPage({ reducedMotion: "reduce" });
await p.goto("http://127.0.0.1:5173");
for (const w of [320, 390, 600, 601, 768, 850, 1024, 1440, 1920]) {
  await p.setViewportSize({ width: w, height: 1000 });
  for (const recipe of ["learn", "plan", "create"]) {
    await p.locator(`[data-recipe="${recipe}"]`).click();
    await p
      .locator("#idea-input")
      .fill(
        "Build a product that connects thoughtful ideas with useful AI features.",
      );
    await p.locator("#assemble-button").click();
    const state = await p.evaluate(() => {
      const area = document
        .querySelector(".assembly-scene")
        .getBoundingClientRect();
      const rects = [
        ".idea-seeds",
        ".intelligence-core",
        ".product-preview",
        ".stack-dock",
      ].map((s) => {
        const r = document.querySelector(s).getBoundingClientRect();
        return { s, x: r.x, y: r.y, w: r.width, h: r.height };
      });
      return {
        area: { x: area.x, y: area.y, w: area.width, h: area.height },
        rects,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
      };
    });
    assert(!state.overflow, `No overflow ${w}`);
    for (const r of state.rects) {
      assert(
        r.y + r.h <= state.area.y + state.area.h + 1,
        `${r.s} fits scene at ${w}`,
      );
      assert(
        r.x >= state.area.x - 1 && r.x + r.w <= state.area.x + state.area.w + 1,
        `${r.s} fits width at ${w}`,
      );
    }
    for (let i = 0; i < state.rects.length; i++)
      for (let j = i + 1; j < state.rects.length; j++) {
        const a = state.rects[i],
          b = state.rects[j];
        assert(
          !(
            a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y
          ),
          `${a.s} overlaps ${b.s} at ${w}`,
        );
      }
  }
}
await p.setViewportSize({ width: 1440, height: 1000 });
await p.locator("#theme-input").fill("lights.off()");
await p.locator("#theme-command button").click();
await p.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
await p.screenshot({ path: ".frames/foundry-dark.png" });
console.log(
  "PASS: all three concepts with long ideas fit without overlap at 320–1920px.",
);
await browser.close();
