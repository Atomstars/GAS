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
assert.match(await page.locator("h1").innerText(), /possibilities/);
assert(
  await page
    .locator(".brand img")
    .first()
    .evaluate((e) => e.complete && e.naturalWidth > 0),
);
await page.waitForSelector("#foundry-stack button");
for (const theme of ["dark", "violet", "light"]) {
  await page.locator("#theme-input").fill(
    {
      dark: "lights.off()",
      violet: "lights.ultraviolet()",
      light: "lights.on()",
    }[theme],
  );
  await page.locator("#theme-command button").click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), theme);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("gas-theme")),
    theme,
  );
}
await page.locator("#theme-input").fill("lights.party()");
await page.locator("#theme-input").press("Enter");
assert.equal(
  await page.locator("#theme-input").getAttribute("aria-invalid"),
  "true",
);
assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
await page.locator("#theme-input").fill("lights.ultraviolet()");
await page.locator("#theme-input").press("Enter");
await page.reload({ waitUntil: "networkidle" });
assert.equal(await page.locator("html").getAttribute("data-theme"), "violet");
await page.locator("#theme-input").fill("lights.on()");
await page.locator("#theme-command button").click();
for (const recipe of ["plan", "create", "learn"]) {
  await page.locator(`[data-recipe="${recipe}"]`).click();
  assert.equal(
    await page
      .locator(`[data-recipe="${recipe}"]`)
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(await page.locator("#foundry-stack button").count(), 4);
}
await page.locator('[data-tool="0"]').click();
assert.match(await page.locator("#stack-purpose").innerText(), /interface/);
const idea = "Explain difficult questions with examples";
await page.locator("#idea-input").fill(idea);
await page.locator("#idea-input").press("Enter");
assert(await page.locator("#assemble-button").isDisabled());
await page.waitForFunction(
  () => document.querySelector("#product-foundry").dataset.phase === "complete",
);
assert.equal(await page.locator("#preview-idea").innerText(), idea);
assert.equal(await page.locator("#seed-contribution").innerText(), idea);
assert(!(await page.locator("#assemble-button").isDisabled()));
await page.locator("#idea-input").fill("   ");
await page.locator("#assemble-button").click();
assert.equal(
  await page.locator("#idea-input").evaluate((e) => e.validity.valid),
  false,
);
await page.locator("#idea-input").fill("Another thought");
await page.locator("#assemble-button").click();
await page.locator('[data-recipe="plan"]').click();
assert.equal(
  await page.locator("#product-foundry").getAttribute("data-phase"),
  "ready",
);
assert(!(await page.locator("#assemble-button").isDisabled()));
await page.emulateMedia({ reducedMotion: "reduce" });
const literal = "<img src=x onerror=alert(1)>";
await page.locator("#idea-input").fill(literal);
await page.locator("#assemble-button").click();
assert.equal(await page.locator("#preview-idea").innerText(), literal);
assert.equal(await page.locator("#preview-idea img").count(), 0);
await page.emulateMedia({ reducedMotion: "no-preference" });
assert(
  await page
    .locator(".lab-shell")
    .evaluate((e) => e.getBoundingClientRect().height < 720),
  "Lab fits in a compact desktop frame",
);
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
await touch.goto("http://127.0.0.1:5173");
await touch.locator('[data-system="buddy"]').tap();
await touch.locator('[data-node="3"]').tap();
assert.match(await touch.locator("#flow-description").innerText(), /Groq/);
await touch.locator('[data-layer="3"]').tap();
assert.equal(
  await touch.locator('[data-layer="3"]').getAttribute("aria-selected"),
  "true",
);
await touch.locator('.project-art[data-project="buddy"]').tap();
assert(await touch.locator("#project-dialog").isVisible());
await touch.locator("#project-dialog .close-dialog").tap();
await touch.locator("#theme-input").fill("lights.off()");
await touch.locator("#theme-command button").tap();
assert.equal(await touch.locator("html").getAttribute("data-theme"), "dark");
await touch.locator('[data-recipe="create"]').tap();
await touch.locator("#idea-input").fill("Make the next step obvious");
await touch.locator("#assemble-button").tap();
assert.equal(
  await touch.locator("#preview-idea").innerText(),
  "Make the next step obvious",
);
const fallback = await browser.newPage({
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce",
});
fallback.on("pageerror", (e) => errors.push(e.message));
await fallback.addInitScript(() => {
  HTMLCanvasElement.prototype.getContext = () => null;
  Storage.prototype.getItem = () => {
    throw new Error("Storage disabled");
  };
  Storage.prototype.setItem = () => {
    throw new Error("Storage disabled");
  };
});
await fallback.goto("http://127.0.0.1:5173");
await fallback.locator('[data-recipe="learn"]').click();
await fallback
  .locator("#idea-input")
  .fill("Build without a graphics dependency");
await fallback.locator("#assemble-button").click();
assert.equal(
  await fallback.locator("#preview-idea").innerText(),
  "Build without a graphics dependency",
);
await fallback.locator("#theme-input").fill("lights.off()");
await fallback.locator("#theme-command button").click();
assert.equal(await fallback.locator("html").getAttribute("data-theme"), "dark");
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "PASS: three persistent themes, safe command validation, three product recipes, custom idea assembly, empty input validation, safe text rendering, cancellation, compact lab, operation without WebGL/storage, alternate system paths, six projects and filters, dialogs and focus restoration, archive search, three architecture routes, playback and stage controls, tech evidence and keyboard navigation, non-overlapping diagrams and no overflow at 320–1920px, reduced motion, touch, and no browser errors.",
);
