import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });
assert.match(await page.locator("h1").innerText(), /few ideas/);
assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
assert(await page.locator("#product-film").evaluate((e) => e.inert));
async function chapter(n) {
  await page.locator('[data-engine-step="' + n + '"]').click();
  await page.waitForFunction(
    (i) => document.querySelector("#engine-stage").dataset.step === String(i),
    n,
  );
  await page.waitForTimeout(700);
}
await chapter(1);
assert.match(await page.locator("h1").innerText(), /Connect/);
await chapter(2);
assert.match(await page.locator("#engine-description").innerText(), /Groq/);
await chapter(3);
await page.waitForFunction(
  () => !document.querySelector("#product-film").inert,
);
assert.match(await page.locator("h1").innerText(), /Buddy/);
await page.locator('[data-buddy-tab="planner"]').click();
await page.locator('[data-task="0"]').click();
assert.equal(
  await page.locator('[data-task="0"]').getAttribute("aria-pressed"),
  "true",
);
await page.locator('[data-buddy-tab="insights"]').click();
assert.match(
  await page.locator("#buddy-demo-content").innerText(),
  /connected story/,
);
await page.locator('[data-buddy-tab="planner"]').click();
assert.equal(
  await page.locator('[data-task="0"]').getAttribute("aria-pressed"),
  "true",
);
await page.locator('[data-task="0"]').click();
assert.equal(
  await page.locator('[data-task="0"]').getAttribute("aria-pressed"),
  "false",
);
await page.locator("#film-scrub").fill("0");
await page.waitForFunction(
  () => document.querySelector("#engine-stage").dataset.step === "0",
);
await page.locator("#engine-play").click();
await page.waitForFunction(
  () => Number(document.querySelector("#engine-stage").dataset.progress) > 0.07,
);
await page.locator("#engine-play").click();
const paused = await page
  .locator("#engine-stage")
  .getAttribute("data-progress");
await page.waitForTimeout(250);
assert.equal(
  await page.locator("#engine-stage").getAttribute("data-progress"),
  paused,
);
await page.evaluate(() => {
  document.documentElement.style.scrollBehavior = "auto";
  const s = document.querySelector("#home"),
    p = document.querySelector(".cinema-pin");
  scrollTo(0, (s.offsetHeight - p.offsetHeight) * 0.96);
});
await page.waitForFunction(
  () => document.querySelector("#engine-stage").dataset.step === "3",
);
await page.evaluate(() => scrollTo(0, 0));
await page.waitForFunction(
  () => document.querySelector("#engine-stage").dataset.step === "0",
);
for (const [command, theme] of [
  ["lights.on()", "light"],
  ["lights.off()", "dark"],
]) {
  await page.locator("#theme-input").fill(command);
  await page.locator("#theme-command button").click();
  await page.waitForFunction(
    (t) => document.documentElement.dataset.theme === t,
    theme,
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("gas-theme")),
    theme,
  );
  assert.equal(
    await page.locator("#theme-command").getAttribute("data-lit"),
    String(theme === "light"),
  );
  await page.waitForTimeout(1100);
}
await page.locator("#theme-input").fill("lights.party()");
await page.locator("#theme-input").press("Enter");
assert.equal(
  await page.locator("#theme-input").getAttribute("aria-invalid"),
  "true",
);
await page.locator("#logo-options-trigger").click();
assert.equal(await page.locator("[data-identity]").count(), 3);
for (const id of ["cutline", "aperture", "editorial"]) {
  await page.locator('[data-identity="' + id + '"]').click();
  assert.match(
    await page.locator(".brand img").first().getAttribute("src"),
    new RegExp(id),
  );
  assert(
    await page
      .locator(".brand img")
      .first()
      .evaluate((e) => e.complete && e.naturalWidth > 0),
  );
}
await page.keyboard.press("Escape");
assert.equal(
  await page.evaluate(() => document.activeElement.id),
  "logo-options-trigger",
);
await page.reload({ waitUntil: "networkidle" });
assert.match(
  await page.locator(".brand img").first().getAttribute("src"),
  /editorial/,
);
assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
assert.equal(await page.locator(".project-card").count(), 6);
for (const [filter, count] of [
  ["ai", 3],
  ["product", 2],
  ["creative", 1],
  ["all", 6],
]) {
  await page.locator(`[data-filter="${filter}"]`).click();
  assert.equal(await page.locator(".project-card").count(), count);
}
await page.locator('.project-art[data-project="moneyfest"]').click();
assert.match(
  await page.locator("#project-detail").innerText(),
  /deterministic checks/,
);
await page.keyboard.press("Escape");
assert(!(await page.locator("#project-dialog").isVisible()));
await page.locator("#open-archive").click();
assert.equal(await page.locator(".archive-row").count(), 14);
await page.locator("#archive-search").fill("OpenFeign");
assert.equal(await page.locator(".archive-row").count(), 1);
await page.locator(".archive-row button").click();
assert.match(await page.locator("#dialog-title").innerText(), /Employee/);
await page.keyboard.press("Escape");
assert.equal(
  await page.evaluate(() => document.activeElement.id),
  "open-archive",
);
await page.locator("#open-archive").click();
await page.locator("#archive-search").fill("no-such-project-123");
assert.match(await page.locator("#archive-results").innerText(), /No matches/);
await page.keyboard.press("Escape");
await page.locator("#flow-play").click();
await page.waitForFunction(
  () => document.querySelector("#flow-progress").textContent === "02 / 05",
);
await page.locator("#flow-play").click();
assert.equal(
  await page.locator("#flow-play").getAttribute("aria-pressed"),
  "false",
);
for (const [system, phrase] of [
  ["gmat", "Ollama"],
  ["buddy", "deterministic"],
  ["moneyfest", "deterministic"],
]) {
  await page.locator(`[data-system="${system}"]`).click();
  assert.equal(await page.locator("#flow-progress").innerText(), "01 / 05");
  await page.locator('[data-node="3"]').click();
  assert.match(
    await page.locator("#flow-description").innerText(),
    new RegExp(phrase, "i"),
  );
  await page.locator("#flow-next").click();
  assert(await page.locator("#flow-next").isDisabled());
}
assert.match(await page.locator("#flow-description").innerText(), /NO_DRIVER/);
await page.locator("#flow-source").click();
assert.match(await page.locator("#dialog-title").innerText(), /MoneyFest/);
await page.keyboard.press("Escape");
await page.locator("#layer-1").click();
await page.locator('[data-tech="2"]').click();
assert.match(await page.locator("#tech-evidence").innerText(), /seven/);
await page.locator("#layer-1").focus();
await page.keyboard.press("ArrowRight");
assert.equal(
  await page.locator("#layer-2").getAttribute("aria-selected"),
  "true",
);
await page.keyboard.press("End");
assert.equal(
  await page.locator("#layer-3").getAttribute("aria-selected"),
  "true",
);
for (const width of [1920, 1440, 1024, 768, 760, 600, 390, 320]) {
  await page.setViewportSize({ width, height: 900 });
  await page.waitForTimeout(100);
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    `No horizontal overflow at ${width}`,
  );
  for (const id of ["gmat", "buddy", "moneyfest"]) {
    await page.locator(`[data-system="${id}"]`).click();
    const nodes = await page.locator(".system-node").evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      }),
    );
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i],
          b = nodes[j];
        assert(
          !(
            a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y
          ),
          `Nodes don't overlap at ${width}`,
        );
      }
  }
}
await page.emulateMedia({ reducedMotion: "reduce" });
assert(
  await page
    .locator("body")
    .evaluate((e) => e.classList.contains("motion-off")),
);
await page.locator('[data-system="gmat"]').click();
await page.locator("#flow-play").click();
assert.equal(await page.locator("#flow-progress").innerText(), "02 / 05");
assert.equal(
  await page.locator("#flow-play").getAttribute("aria-pressed"),
  "false",
);
await page.locator('[data-system="buddy"]').click();
await page.locator('[data-path="fallback"]').click();
await page.locator('[data-node="3"]').click();
assert.match(
  await page.locator("#flow-description").innerText(),
  /deterministic heuristics/,
);
await page.locator('[data-system="moneyfest"]').click();
await page.locator('[data-path="fallback"]').click();
await page.locator('[data-node="4"]').click();
assert.match(await page.locator("#flow-description").innerText(), /NO_DRIVER/);
await page.locator('[data-system="gmat"]').click();
await page.locator('[data-path="fallback"]').click();
await page.locator('[data-node="4"]').click();
assert.match(
  await page.locator("#flow-description").innerText(),
  /explicit service error/,
);

const touch = await browser.newPage({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  reducedMotion: "reduce",
});
touch.on("pageerror", (e) => errors.push(e.message));
await touch.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });
await touch.locator('[data-engine-step="3"]').tap();
assert.equal(
  await touch.locator("#engine-stage").getAttribute("data-step"),
  "3",
);
await touch.locator('[data-buddy-tab="planner"]').tap();
await touch.locator('[data-task="1"]').tap();
assert.equal(
  await touch.locator('[data-task="1"]').getAttribute("aria-pressed"),
  "true",
);
await touch.locator("#theme-command button").tap();
assert.equal(await touch.locator("html").getAttribute("data-theme"), "light");
await touch.locator("#logo-options-trigger").tap();
await touch.locator('[data-identity="aperture"]').tap();
await touch.locator("#identity-done").tap();
assert.match(
  await touch.locator(".brand img").first().getAttribute("src"),
  /aperture-light/,
);
await touch.locator('[data-system="buddy"]').tap();
await touch.locator('[data-node="3"]').tap();
assert.match(await touch.locator("#flow-description").innerText(), /Groq/);
const fallback = await browser.newPage({
  viewport: { width: 320, height: 780 },
  reducedMotion: "reduce",
});
fallback.on("pageerror", (e) => errors.push(e.message));
await fallback.addInitScript(() => {
  HTMLCanvasElement.prototype.getContext = () => null;
  Storage.prototype.getItem = () => {
    throw Error("blocked");
  };
  Storage.prototype.setItem = () => {
    throw Error("blocked");
  };
});
await fallback.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });
await fallback.locator('[data-engine-step="3"]').click();
assert(!(await fallback.locator("#product-film").evaluate((e) => e.inert)));
await fallback.locator('[data-buddy-tab="insights"]').click();
assert.match(await fallback.locator("#buddy-heading").innerText(), /patterns/);
await fallback.locator("#theme-command button").click();
assert.equal(
  await fallback.locator("html").getAttribute("data-theme"),
  "light",
);
assert(
  await fallback.evaluate(
    () => document.documentElement.scrollWidth <= innerWidth + 1,
  ),
);
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "PASS: scroll film, playback/pause, manual chapters, touch scrub controls, interactive Buddy views and tasks, lighting states and validation, three persistent logo concepts, reduced motion, no canvas/storage dependency, responsive layouts, project dialogs, archive, system paths, and keyboard controls.",
);
