import "./workbench.css";
import "./kinetic.css";
import "./foundry.css";
import "./atelier.css";
import "./cinema-opening.css";
import "./product-film.css";
import { createExperience } from "./kinetic.js";
import { drawSystemMap, nodeIcon, setMapLabels } from "./systemMap.js";
import { catalog, repoUrl } from "./data/studioCatalog.js";
import { layers } from "./data/toolkit.js";
import { systems } from "./data/systems.js";
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const get = (id) => catalog.find((p) => p.id === id);
const link = (url, label, cls = "button outline") =>
  `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
const featured = [
  ["moneyfest", "ai"],
  ["buddy", "ai"],
  ["gmat", "product"],
  ["davina", "creative"],
  ["cafe", "product"],
  ["gmat-system", "ai"],
];
const chart =
  '<svg viewBox="0 0 420 100" aria-hidden="true"><path class="chart-grid" d="M0 20H420M0 50H420M0 80H420"/><path class="chart-fill" d="M0 76L20 71 40 80 60 53 80 60 100 43 120 55 140 44 160 61 180 50 200 59 220 40 240 49 260 21 280 28 300 15 320 33 340 18 360 25 380 8 400 20 420 12V100H0Z"/><path class="chart-line" d="M0 76L20 71 40 80 60 53 80 60 100 43 120 55 140 44 160 61 180 50 200 59 220 40 240 49 260 21 280 28 300 15 320 33 340 18 360 25 380 8 400 20 420 12"/></svg>';
const bars = [45, 65, 50, 85, 60, 100, 75]
  .map(
    (h, i) =>
      `<i style="--h:${h}%"><small>${["M", "T", "W", "T", "F", "S", "S"][i]}</small></i>`,
  )
  .join("");
const screenHeader = (name, context) =>
  `<div class="product-bar"><b>${name}</b><span>${context}</span><i>↗</i></div>`;
const art = {
  moneyfest: `<div class="product-screen money-screen">${screenHeader("m / MoneyFest", "OVERVIEW &nbsp; EVIDENCE")}<div class="product-content"><span class="mini-label">MARKET INTELLIGENCE</span><h4>Every move has a story.<br>Find the evidence.</h4><div class="market-metric"><strong>Beyond the price.</strong><span>ILLUSTRATIVE SERIES ↗</span></div>${chart}<div class="evidence-card"><span>↗</span><div><b>Evidence before explanation.</b><small>Gate → Attribute → Verify → Cite</small></div><i>✓</i></div></div></div>`,
  buddy: `<div class="product-screen buddy-screen">${screenHeader("buddy.", "YOUR DAY, CONNECTED")}<div class="product-content"><span class="mini-label">A LITTLE MORE CLARITY</span><h4>Good habits.<br>A clearer head.</h4><div class="buddy-dashboard"><div class="week-card"><span class="mini-label">THIS WEEK / SAMPLE</span><div class="mini-bars">${bars}</div></div><div class="reflection-card"><span>✳</span><b>Make room for<br>what matters.</b><small>Spending. Tasks. Mood.</small></div></div><div class="buddy-bottom"><span>○ &nbsp; Your money</span><span>◷ &nbsp; Your time</span><span>☼ &nbsp; Your mood</span></div></div></div>`,
  gmat: `<div class="product-screen gmat-screen">${screenHeader("GMAT / TRAINER", "VERBAL REASONING")}<div class="product-content"><div class="lesson-progress"><i></i><span>QUESTION 04 / 10 · DEMO</span></div><span class="mini-label">CRITICAL REASONING</span><h4>Build the reasoning.<br>Not just the answer.</h4><div class="answer"><span>A</span> Identify an alternative explanation</div><div class="answer chosen"><span>B</span> Connect the claim to its evidence <b>✓</b></div><div class="answer"><span>C</span> Challenge the underlying assumption</div><div class="lesson-foot"><span>← Previous</span><b>Check reasoning →</b></div></div></div>`,
  davina: `<div class="product-screen aerospace-screen">${screenHeader("DAVINA®", "AEROSPACE / DIGITAL")}<div class="aerospace-cross" aria-hidden="true">+</div><div class="aerospace-lines" aria-hidden="true"></div><div class="aerospace-content"><span class="mini-label">ENGINEERING A DIGITAL PRESENCE</span><h4>Beyond<br>the horizon.</h4><span class="aerospace-link">EXPLORE THE MISSION ↗</span></div><div class="aerospace-bottom">REACT THREE FIBER <span>EXPERIENCE / 01</span></div></div>`,
  cafe: `<div class="product-screen cafe-screen">${screenHeader("the daily / café", "ORDER MANAGEMENT")}<div class="product-content"><span class="mini-label">FROM COUNTER TO WORKFLOW</span><h4>A better flow.<br>One order at a time.</h4><div class="order-table"><div><span>ORDER / SAMPLE</span><span>STATUS</span></div><div><b>#014 &nbsp; Flat white × 2</b><span class="order-ready">Ready ↗</span></div><div><b>#015 &nbsp; Iced latte</b><span>Preparing</span></div><div><b>#016 &nbsp; Espresso</b><span>Received</span></div></div><div class="cafe-flow">NEXT.JS <i>→</i> PRISMA <i>→</i> POSTGRESQL</div></div></div>`,
  "gmat-system": `<div class="product-screen local-screen">${screenHeader("⌘ Local tutor", "OLLAMA / FASTAPI")}<div class="product-content"><span class="mini-label">YOUR CONTENT. YOUR CONTEXT.</span><h4>Intelligence,<br>closer to home.</h4><div class="chat-question">How should I approach this question?</div><div class="chat-answer"><span>◎</span><div><b>Start with the underlying assumption.</b><small>Use the question and its official explanation as context for the conversation.</small></div></div><div class="chat-input">Ask a follow-up… <b>↑</b></div></div></div>`,
};
function renderProjects(filter = "all") {
  $("#projects").innerHTML = featured
    .filter(([, type]) => filter === "all" || type === filter)
    .map(([id, type]) => {
      const p = get(id);
      return `<article class="project-card"><button class="project-art art-${id}" data-project="${id}" aria-label="Explore ${esc(p.name)}"><span class="art-meta"><span>0${featured.findIndex((x) => x[0] === id) + 1} / ${esc(p.type.toUpperCase())}</span><span>INTERFACE STUDY</span></span>${art[id]}<span class="art-arrow">↗</span></button><div class="project-info"><div class="project-index">${esc(p.category)}</div><div class="project-info-top"><h3><button data-project="${id}">${esc(p.name)}</button></h3><span class="project-type">${type === "ai" ? "AI & INTELLIGENCE" : type === "creative" ? "CREATIVE DEVELOPMENT" : "PRODUCT ENGINEERING"}</span></div><p>${esc(p.description)}</p><div class="tags">${p.stack
        .slice(0, 4)
        .map((s) => `<span>${esc(s)}</span>`)
        .join(
          "",
        )}</div><button class="project-cta" data-project="${id}">BEHIND THE BUILD <span>↗</span></button></div></article>`;
    })
    .join("");
}
renderProjects();
let dialogOrigin = null;
function showDialog(dialog) {
  dialogOrigin = document.activeElement;
  dialog.showModal();
  dialog.scrollTop = 0;
}
function openProject(id) {
  const p = get(id);
  if (!p) return;
  const origin = document.activeElement;
  if ($("#archive-dialog").open) $("#archive-dialog").close();
  $("#project-detail").innerHTML =
    `<p class="eyebrow">${esc(p.category)}</p><h2 id="dialog-title">${esc(p.name)}</h2><p>${esc(p.description)}</p><div class="tags">${p.stack.map((s) => `<span>${esc(s)}</span>`).join("")}</div><div class="detail-pipeline">${p.pipeline.map((s, i) => `<div><small>0${i + 1} / SYSTEM</small>${esc(s)}</div>`).join("")}</div><h3>${esc(p.question)}</h3><p>${esc(p.answer)}</p><h3>Inside the implementation</h3><p>${esc(p.detail)}</p><div class="detail-links">${link(repoUrl(p), "Read the source", "button primary")}${p.url ? link(p.url, "Open listed preview") : ""}</div><div class="source-note">${esc(p.status)} · Public source reviewed September 26, 2026.<br>Interface studies are visual reconstructions. Dated deployment captures are shown below where available.</div>${p.image ? `<img class="detail-image" src="${p.image}" alt="${esc(p.name)} public interface captured September 23, 2026" loading="lazy"><div class="source-note">Public interface capture / September 23, 2026</div>` : ""}`;
  showDialog($("#project-dialog"));
  dialogOrigin = origin.closest("#archive-dialog")
    ? $("#open-archive")
    : origin;
}
function archive(query = "") {
  const rows = catalog.filter((p) =>
    `${p.name} ${p.stack.join(" ")} ${p.description}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  $("#archive-results").innerHTML = rows.length
    ? rows
        .map(
          (p) =>
            `<div class="archive-row"><span>${String(catalog.indexOf(p) + 1).padStart(2, "0")}</span><button data-project="${p.id}"><b>${esc(p.name)}</b><small>${esc(p.status)} · ${esc(p.stack.slice(0, 3).join(" / "))}</small></button>${link(repoUrl(p), "Source", "")}</div>`,
        )
        .join("")
    : "<p>No matches. Try another project or technology.</p>";
}
$("#open-archive").addEventListener("click", () => {
  archive();
  $("#archive-search").value = "";
  showDialog($("#archive-dialog"));
});
$("#archive-search").addEventListener("input", (e) => archive(e.target.value));
$$(".close-dialog").forEach((b) =>
  b.addEventListener("click", () => b.closest("dialog").close()),
);
$$("dialog").forEach((d) => {
  d.addEventListener("close", () => {
    if (!document.querySelector("dialog[open]"))
      dialogOrigin?.focus({ preventScroll: true });
  });
  d.addEventListener("click", (e) => {
    if (e.target !== d) return;
    const r = d.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      d.close();
  });
  d.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      d.close();
    }
  });
});
let activeLayer = 0;
function selectTech(i) {
  const t = layers[activeLayer].items[i];
  $$(".tech").forEach((b, index) =>
    b.setAttribute("aria-pressed", String(index === i)),
  );
  $("#tech-evidence").innerHTML =
    `<p>${esc(t.description)}</p><div class="evidence-links">${t.ids.map((id) => `<button data-project="${id}">${esc(get(id).name)} ↗</button>`).join("")}</div>`;
}
function selectLayer(i) {
  activeLayer = i;
  $$(".stack-tab").forEach((b, index) => {
    b.setAttribute("aria-selected", String(index === i));
    b.tabIndex = index === i ? 0 : -1;
  });
  $("#stack-panel").setAttribute("aria-labelledby", `layer-${i}`);
  $("#layer-label").textContent = layers[i].label;
  $("#tech-grid").innerHTML = layers[i].items
    .map(
      (t, index) =>
        `<button class="tech" data-tech="${index}" aria-pressed="false"><span class="tech-icon" aria-hidden="true">${t.icon}</span><span><b>${t.name}</b><small>${String(t.ids.length).padStart(2, "0")} ${t.ids.length === 1 ? "PROJECT" : "PROJECTS"}</small></span></button>`,
    )
    .join("");
  selectTech(0);
}
$(".stack-tabs").innerHTML = layers
  .map(
    (l, i) =>
      `<button class="stack-tab" role="tab" id="layer-${i}" aria-controls="stack-panel" data-layer="${i}" aria-selected="false"><span>0${i + 1}</span><b>${l.name}</b><i>↗</i></button>`,
  )
  .join("");
selectLayer(0);
$(".stack-tabs").addEventListener("keydown", (e) => {
  if (
    ![
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
    ].includes(e.key)
  )
    return;
  e.preventDefault();
  const n =
    e.key === "Home"
      ? 0
      : e.key === "End"
        ? 3
        : (activeLayer + (["ArrowUp", "ArrowLeft"].includes(e.key) ? 3 : 1)) %
          4;
  selectLayer(n);
  $(`#layer-${n}`).focus();
});
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
let motionEnabled = !reduced.matches;
const experience = createExperience(() => motionEnabled);
let systemScenario = "standard";
let selected = "gmat",
  active = 0,
  playing = false,
  flowTimer = null,
  labVisible = false;
const routeNotes = {
  gmat: [
    "WHEN A MODEL IS UNAVAILABLE",
    "Try the smaller local model. If the service cannot connect, return an explicit error.",
  ],
  buddy: [
    "A USEFUL FALLBACK",
    "Missing key or failed model call? Deterministic heuristics can still return a structured reflection.",
  ],
  moneyfest: [
    "UNCERTAINTY IS AN OUTCOME",
    "Ordinary movement bypasses reasoning. Unsupported explanations end in NO_DRIVER.",
  ],
};
const fallbackSteps = {
  gmat: [
    [
      "Try the smaller model",
      "Ollama fallback",
      "The primary local model is unavailable. The implementation attempts a smaller fallback model using the same question context and conversation history.",
      ["Ollama", "Fallback model"],
    ],
    [
      "Return reply or error",
      "API → interface",
      "If the fallback succeeds, the API returns its reply. If the local service still cannot connect, the request returns an explicit service error.",
      ["JSON response", "Error handling"],
    ],
  ],
  buddy: [
    [
      "Use deterministic reflection",
      "Heuristic fallback",
      "Without a provider key, or when the model call fails, Buddy uses deterministic heuristics to build a structured reflection from the day’s signals.",
      ["Heuristics", "Provider failure"],
    ],
    [
      "Show the fallback reflection",
      "Structured response",
      "The interface receives the same structured reflection fields. The engine field records that heuristics produced the result.",
      ["Stable response shape", "Engine field"],
    ],
  ],
  moneyfest: [
    [
      "Reject unsupported claims",
      "Verification checks",
      "Candidate explanations fail the deterministic checks or the entailment verifier. Unsupported claims are rejected and logged instead of being presented as facts.",
      ["Claim validation", "Rejected-claim log"],
    ],
    [
      "Return no clear driver",
      "NO_DRIVER",
      "No candidate survives verification. The system returns NO_DRIVER: the available evidence does not support a clear explanation.",
      ["Abstention", "Evidence boundary"],
    ],
  ],
};
const traces = {
  gmat: [
    "→ question + conversation history",
    "→ POST /tutor/chat",
    "→ SQLite: question + explanation",
    "→ Ollama: context + local inference",
    "✓ JSON: tutor reply → interface",
  ],
  buddy: [
    "→ tasks + spending + mood",
    "→ Express: server-side boundary",
    "→ Buddy Brain: assemble context",
    "→ Groq JSON / heuristic fallback",
    "✓ summary + wins + next focus",
  ],
  moneyfest: [
    "→ prices + filings + news",
    "→ gate: investigate eligible event",
    "→ model: propose candidate drivers",
    "→ deterministic checks + verifier",
    "✓ cited explanation / NO_DRIVER",
  ],
};
function stopFlow() {
  clearTimeout(flowTimer);
  flowTimer = null;
}
function scheduleFlow() {
  stopFlow();
  if (playing && motionEnabled && labVisible && !document.hidden)
    flowTimer = setTimeout(() => {
      active++;
      if (active >= 4) {
        active = 4;
        playing = false;
      }
      updateFlow();
      scheduleFlow();
    }, 1700);
}
function updateFlow() {
  const model = systems[selected],
    step =
      systemScenario === "fallback" && active >= 3
        ? fallbackSteps[selected][active - 3]
        : model.steps[active];
  $$("[data-node]").forEach((b, i) => {
    b.setAttribute("aria-pressed", String(i === active));
    b.classList.toggle("completed", i < active);
  });
  $$("[data-node]").forEach((b, i) => {
    b.querySelector("b").textContent =
      systemScenario === "fallback" && i >= 3
        ? fallbackSteps[selected][i - 3][0]
        : model.steps[i][0];
  });
  $("#flow-step-label").textContent =
    `STAGE 0${active + 1} / ${active === 0 ? "INPUT" : active === 4 ? "OUTPUT" : "PROCESS"}`;
  $("#flow-title").textContent = step[0];
  $("#flow-description").textContent = step[2];
  $("#flow-tools").innerHTML = step[3]
    .map((t) => `<span>${esc(t)}</span>`)
    .join("");
  $("#flow-progress").textContent = `0${active + 1} / 05`;
  $("#flow-prev").disabled = active === 0;
  $("#flow-next").disabled = active === 4;
  $("#flow-play").innerHTML = !motionEnabled
    ? active === 4
      ? "Restart flow <span>↻</span>"
      : "Next stage <span>→</span>"
    : playing
      ? "Pause request <span>Ⅱ</span>"
      : active === 4
        ? "Replay request <span>↻</span>"
        : "Play request <span>▷</span>";
  $("#flow-play").setAttribute("aria-pressed", String(playing));
  $(".lab-shell").classList.toggle("playing", playing);
  requestAnimationFrame(() =>
    drawSystemMap(
      active,
      playing && motionEnabled && labVisible && !document.hidden,
    ),
  );
  const traceRows = [...traces[selected]];
  if (systemScenario === "fallback") {
    traceRows[3] = "↳ " + fallbackSteps[selected][0][0];
    traceRows[4] = "✓ " + fallbackSteps[selected][1][0];
  }
  $("#flow-trace").textContent = traceRows.slice(0, active + 1).join("\n");
}
function selectSystem(id) {
  stopFlow();
  selected = id;
  systemScenario = "standard";
  $$("[data-path]").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.path === "standard")),
  );
  $("#fallback-path").textContent =
    id === "moneyfest" ? "No supporting evidence" : "Model unavailable";
  active = 0;
  playing = false;
  const model = systems[id];
  setMapLabels(id);
  $("#system-name").textContent = model.name;
  $("#flow-source").dataset.project = model.project;
  $$("[data-system]").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.system === id)),
  );
  $("#system-nodes").innerHTML = model.steps
    .map(
      (s, i) =>
        `<button class="system-node" data-node="${i}" aria-pressed="false"><span class="node-device">${nodeIcon(i, id)}</span><small>0${i + 1} / ${i === 0 ? "CLIENT" : i === 4 ? "RESPONSE" : "SERVICE"}</small><b>${esc(s[0])}</b><span>${esc(s[1])}</span></button>`,
    )
    .join("");
  $("#route-note").innerHTML =
    `<span>↳ ${routeNotes[id][0]}</span><p>${routeNotes[id][1]}</p>`;
  updateFlow();
}
$("#flow-prev").addEventListener("click", () => {
  stopFlow();
  playing = false;
  active = Math.max(0, active - 1);
  updateFlow();
});
$("#flow-next").addEventListener("click", () => {
  stopFlow();
  playing = false;
  active = Math.min(4, active + 1);
  updateFlow();
});
$("#flow-play").addEventListener("click", () => {
  if (!motionEnabled) {
    active = active === 4 ? 0 : active + 1;
    playing = false;
    updateFlow();
    return;
  }
  playing = !playing;
  if (playing && active === 4) active = 0;
  updateFlow();
  scheduleFlow();
});
selectSystem("gmat");
document.fonts?.ready.then(updateFlow);
new IntersectionObserver(
  ([e]) => {
    labVisible = e.isIntersecting;
    scheduleFlow();
    updateFlow();
  },
  { threshold: 0.05 },
).observe($(".lab-shell"));
new ResizeObserver(() =>
  drawSystemMap(
    active,
    playing && motionEnabled && labVisible && !document.hidden,
  ),
).observe($("#system-map"));
document.addEventListener("visibilitychange", () => {
  scheduleFlow();
  updateFlow();
});
function updateMotion() {
  document.body.classList.toggle("motion-off", !motionEnabled);
  document.documentElement.style.scrollBehavior = motionEnabled
    ? "smooth"
    : "auto";
  $("#motion-toggle").textContent = `Motion: ${motionEnabled ? "on" : "off"}`;
  $("#motion-toggle").setAttribute("aria-pressed", String(!motionEnabled));
  if (!motionEnabled) {
    playing = false;
    stopFlow();
  }
  experience.setMotion(motionEnabled);
  updateFlow();
}
$("#motion-toggle").addEventListener("click", () => {
  motionEnabled = !motionEnabled;
  updateMotion();
});
reduced.addEventListener("change", () => {
  motionEnabled = !reduced.matches;
  updateMotion();
});
updateMotion();
document.addEventListener("click", (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  if (t.dataset.project) openProject(t.dataset.project);
  if (t.dataset.layer !== undefined) selectLayer(Number(t.dataset.layer));
  if (t.dataset.tech !== undefined) selectTech(Number(t.dataset.tech));
  if (t.dataset.filter) {
    $$("[data-filter]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b === t)),
    );
    renderProjects(t.dataset.filter);
  }
  if (t.dataset.system) selectSystem(t.dataset.system);
  if (t.dataset.path) {
    stopFlow();
    playing = false;
    systemScenario = t.dataset.path;
    active = 0;
    $$("[data-path]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b === t)),
    );
    updateFlow();
  }
  if (t.dataset.node !== undefined) {
    stopFlow();
    playing = false;
    active = Number(t.dataset.node);
    updateFlow();
  }
});
const reveals = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.remove("pending");
        reveals.unobserve(e.target);
      }
    }),
  { threshold: 0.08 },
);
$$(".section-heading,.toolkit,.about-grid,.process").forEach((el) => {
  el.classList.add("reveal");
  if (motionEnabled) el.classList.add("pending");
  reveals.observe(el);
});
let scrollFrame = 0;
function scrollProgress() {
  scrollFrame = 0;
  const max = document.documentElement.scrollHeight - innerHeight;
  document.documentElement.style.setProperty(
    "--read",
    max > 0 ? scrollY / max : 0,
  );
}
addEventListener(
  "scroll",
  () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(scrollProgress);
  },
  { passive: true },
);
addEventListener("resize", scrollProgress);
scrollProgress();
const chapters = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (e.isIntersecting)
        $$("nav a").forEach((a) =>
          a.classList.toggle("section-active", a.hash === "#" + e.target.id),
        );
    }),
  { rootMargin: "-15% 0px -55% 0px" },
);
$$("#work,#lab,#stack").forEach((el) => chapters.observe(el));
document.addEventListener("pointerdown", (e) => {
  if (!motionEnabled) return;
  const target = e.target.closest(".button");
  if (!target) return;
  const r = target.getBoundingClientRect(),
    ripple = document.createElement("span");
  ripple.className = "touch-ripple";
  ripple.style.left = e.clientX - r.left + "px";
  ripple.style.top = e.clientY - r.top + "px";
  target.append(ripple);
  setTimeout(() => ripple.remove(), 650);
});
