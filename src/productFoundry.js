const recipes = {
  learn: {
    problem: "Too much to learn.",
    opportunity: "A little, every day.",
    suggestion: "Practice that adapts to me",
    url: "learnspace / workspace",
    category: "A PERSONAL LEARNING PRODUCT",
    title: ["A little wiser.", "Every day."],
    tiles: ["Daily practice", "Your progress", "Ask your tutor"],
    metric: "TODAY’S LEARNING PATH",
    bars: [35, 58, 42, 75, 62, 90, 80],
    stack: [
      [
        "React",
        "Interface",
        "A clear practice interface, built around reusable components.",
      ],
      [
        "FastAPI",
        "Services",
        "An API that connects practice content to the tutor.",
      ],
      ["Ollama", "AI", "Local inference brings context into the conversation."],
      [
        "SQLite",
        "Memory",
        "Structured question data gives the tutor a useful foundation.",
      ],
    ],
  },
  plan: {
    problem: "Too many moving parts.",
    opportunity: "One connected day.",
    suggestion: "Connect my tasks, mood, and spending",
    url: "daylight / overview",
    category: "A MORE THOUGHTFUL DAILY COMPANION",
    title: ["Less scattered.", "More intentional."],
    tiles: ["Your tasks", "Your spending", "Daily reflection"],
    metric: "ROOM FOR WHAT MATTERS",
    bars: [60, 45, 70, 65, 85, 55, 90],
    stack: [
      [
        "React",
        "Interface",
        "Bring tasks, spending, and reflection into one interface.",
      ],
      [
        "Node.js",
        "Services",
        "A server connects daily signals to the assistant.",
      ],
      [
        "Groq",
        "AI",
        "Structured reflections connect patterns across your day.",
      ],
      [
        "Supabase",
        "Memory",
        "Keep the application’s records connected to its interface.",
      ],
    ],
  },
  create: {
    problem: "An idea, still on paper.",
    opportunity: "A useful first version.",
    suggestion: "Turn my rough brief into an actionable plan",
    url: "launchpad / project",
    category: "AN AI-ASSISTED PRODUCT CONCEPT",
    title: ["Start small.", "Build something real."],
    tiles: ["Your brief", "Build plan", "Next milestone"],
    metric: "FROM FIRST THOUGHT TO FIRST VERSION",
    bars: [25, 40, 55, 45, 65, 80, 100],
    stack: [
      [
        "Next.js",
        "Interface",
        "Give the product a focused, navigable web experience.",
      ],
      [
        "Python",
        "Services",
        "Coordinate the logic that turns inputs into useful results.",
      ],
      [
        "LLM",
        "AI",
        "Propose structure and next steps from a human-written brief.",
      ],
      [
        "PostgreSQL",
        "Memory",
        "A relational foundation for projects, plans, and progress.",
      ],
    ],
  },
};
export function createProductFoundry(motionEnabled) {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  let selected = "learn",
    phase = "ready",
    timer = null,
    visible = true;
  const host = $("#product-foundry");
  function animate(el, frames, options) {
    if (motionEnabled()) el.animate(frames, options);
  }
  function drawWires() {
    const area = $("#assembly-scene"),
      svg = $("#assembly-wires"),
      r = area.getBoundingClientRect();
    if (!r.width) return;
    svg.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
    const rect = (id) => {
      const q = $(id).getBoundingClientRect();
      return { x: q.left - r.left, y: q.top - r.top, w: q.width, h: q.height };
    };
    const core = rect("#intelligence-core"),
      out = rect("#product-preview"),
      dock = rect(".stack-dock");
    const narrow = getComputedStyle(area).display === "grid";
    const paths = ["#seed-one", "#seed-two", "#your-seed"].map((id, i) => {
      const s = rect(id);
      let a, b, d;
      if (narrow) {
        a = [s.x + s.w, s.y + s.h / 2];
        b = [core.x, core.y + core.h / 2];
        d = `M${a} H${(a[0] + b[0]) / 2} V${b[1]} H${b[0]}`;
      } else {
        a = [s.x + s.w, s.y + s.h / 2];
        b = [core.x, core.y + core.h / 2];
        d = `M${a} C${a[0] + 40},${a[1]} ${b[0] - 35},${b[1]} ${b}`;
      }
      return `<path class="assembly-wire seed-wire wire-${i}" d="${d}"/>`;
    });
    const a = narrow
        ? [core.x + core.w / 2, core.y + core.h]
        : [core.x + core.w, core.y + core.h / 2],
      b = narrow ? [out.x + out.w / 2, out.y] : [out.x, out.y + out.h / 2];
    const output = narrow
      ? `M${a} V${a[1] + 18} H${r.width - 6} V${b[1] - 12} H${b[0]} V${b[1]}`
      : `M${a} H${(a[0] + b[0]) / 2} V${b[1]} H${b[0]}`;
    const c = [dock.x + dock.w / 2, dock.y],
      d = [core.x + core.w / 2, core.y + core.h];
    const tech = narrow
      ? `M${c} V${c[1] - 13} H${r.width - 12} V${d[1] + 15} H${d[0]} V${d[1]}`
      : `M${c} V${c[1] - 35} H${d[0]} V${d[1]}`;
    svg.innerHTML =
      paths.join("") +
      `<path class="assembly-wire output-wire" d="${output}"/><path class="assembly-wire tech-wire" d="${tech}"/>`;
  }
  function setPhase(value) {
    phase = value;
    host.dataset.phase = value;
    const states = {
      ready: "A few ideas. A connected product.",
      ideas: "01 / Your idea joins the starting point.",
      stack: "02 / Connecting the interface, services, and data.",
      ai: "03 / Adding context and intelligence.",
      complete: "04 / Your idea is part of the product concept.",
    };
    $("#assembly-status").textContent = states[value];
    $("#preview-status").textContent =
      value === "complete"
        ? "CONCEPT ASSEMBLED. IMAGINE WHAT’S NEXT."
        : value === "ready"
          ? "YOUR NEXT PRODUCT, REIMAGINED."
          : "ASSEMBLING YOUR CONCEPT…";
  }
  function complete() {
    clearTimeout(timer);
    timer = null;
    setPhase("complete");
    $("#preview-idea").textContent = $("#seed-contribution").textContent;
    $("#assemble-button").disabled = false;
    $("#assemble-button").innerHTML = "Build another idea <span>↗</span>";
    animate(
      $("#product-preview"),
      [
        { transform: "translateY(14px) scale(.97)", opacity: 0.65 },
        { transform: "translateY(0) scale(1)", opacity: 1 },
      ],
      { duration: 550, easing: "cubic-bezier(.2,.8,.2,1)" },
    );
  }
  function schedule() {
    clearTimeout(timer);
    if (
      !["ideas", "stack", "ai"].includes(phase) ||
      !visible ||
      document.hidden
    )
      return;
    timer = setTimeout(() => {
      if (phase === "ideas") {
        setPhase("stack");
        schedule();
      } else if (phase === "stack") {
        setPhase("ai");
        schedule();
      } else complete();
    }, 850);
  }
  function chooseRecipe(id) {
    clearTimeout(timer);
    selected = id;
    const r = recipes[id];
    $$("[data-recipe]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.recipe === id)),
    );
    $("#seed-problem").textContent = r.problem;
    $("#seed-opportunity").textContent = r.opportunity;
    $("#idea-input").value = r.suggestion;
    $("#seed-contribution").textContent = r.suggestion;
    $("#preview-idea").textContent = r.suggestion;
    $("#preview-url").textContent = r.url;
    $("#preview-category").textContent = r.category;
    $("#preview-title").replaceChildren(
      ...r.title.flatMap((line, i) =>
        i
          ? [document.createElement("br"), document.createTextNode(line)]
          : [document.createTextNode(line)],
      ),
    );
    $("#preview-content").innerHTML =
      `<div class="preview-modules">${r.tiles.map((t, i) => `<span><i>${["◫", "◷", "✳"][i]}</i>${t}</span>`).join("")}</div><div class="preview-chart"><span>${r.metric}</span><div>${r.bars.map((h) => `<i style="--h:${h}%"></i>`).join("")}</div><small>ILLUSTRATIVE PREVIEW</small></div>`;
    $("#foundry-stack").innerHTML = r.stack
      .map(
        (s, i) =>
          `<button data-tool="${i}" aria-pressed="${i === 2}"><span>${["◫", "⌘", "✳", "▤"][i]}</span><b>${s[0]}</b><small>${s[1]}</small></button>`,
      )
      .join("");
    $("#stack-purpose").textContent = r.stack[2][2];
    $("#assemble-button").disabled = false;
    $("#assemble-button").innerHTML = "Build the possibility <span>↗</span>";
    setPhase("ready");
    requestAnimationFrame(drawWires);
    animate(
      $("#product-preview"),
      [
        { opacity: 0.4, transform: "translateY(8px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 350, easing: "ease-out" },
    );
  }
  $$("[data-recipe]").forEach((b) =>
    b.addEventListener("click", () => chooseRecipe(b.dataset.recipe)),
  );
  $("#foundry-stack").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tool]");
    if (!b) return;
    $$("[data-tool]").forEach((t) =>
      t.setAttribute("aria-pressed", String(t === b)),
    );
    $("#stack-purpose").textContent =
      recipes[selected].stack[Number(b.dataset.tool)][2];
    animate(
      b,
      [
        { transform: "translateY(0)" },
        { transform: "translateY(-5px)" },
        { transform: "translateY(0)" },
      ],
      { duration: 300 },
    );
  });
  $("#idea-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#idea-input"),
      idea = input.value.trim();
    if (!idea) {
      input.setCustomValidity("Add a small idea to continue.");
      input.reportValidity();
      return;
    }
    input.setCustomValidity("");
    clearTimeout(timer);
    $("#seed-contribution").textContent = idea;
    $("#assemble-button").disabled = true;
    $("#assemble-button").textContent = "Connecting…";
    setPhase("ideas");
    animate(
      $("#your-seed"),
      [
        { transform: "scale(.94)", opacity: 0.3 },
        { transform: "scale(1)", opacity: 1 },
      ],
      { duration: 400, easing: "cubic-bezier(.2,.8,.2,1)" },
    );
    if (motionEnabled()) schedule();
    else complete();
  });
  $("#idea-input").addEventListener("input", () =>
    $("#idea-input").setCustomValidity(""),
  );
  new ResizeObserver(drawWires).observe($("#assembly-scene"));
  new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
      host.classList.toggle("assembly-paused", !visible);
      schedule();
    },
    { threshold: 0.05 },
  ).observe(host);
  document.addEventListener("visibilitychange", () => {
    host.classList.toggle("assembly-paused", document.hidden || !visible);
    schedule();
  });
  document.fonts?.ready.then(drawWires);
  host.addEventListener("pointermove", (e) => {
    if (!motionEnabled() || e.pointerType === "touch") return;
    const r = host.getBoundingClientRect();
    host.style.setProperty(
      "--pointer-x",
      `${((e.clientX - r.left) / r.width) * 100}%`,
    );
    host.style.setProperty(
      "--pointer-y",
      `${((e.clientY - r.top) / r.height) * 100}%`,
    );
  });
  chooseRecipe("learn");
  return {
    setMotion(value) {
      if (!value && ["ideas", "stack", "ai"].includes(phase)) complete();
    },
  };
}
