const chapters = [
  {
    title: "It starts with",
    em: "a few ideas.",
    description:
      "A clearer view of money. A more intentional day. Space to understand yourself.",
    tools: "MONEY + TIME + WELLBEING",
    label: "01 / THE INGREDIENTS",
    detail: "Three small ideas. One possibility.",
  },
  {
    title: "Connect the dots.",
    em: "Find the product.",
    description:
      "Bring those ideas together: one place for your spending, plans, and daily patterns.",
    tools: "REACT · NODE.JS · SUPABASE",
    label: "02 / THE CONNECTION",
    detail: "One connected day.",
  },
  {
    title: "Add intelligence.",
    em: "Keep it human.",
    description:
      "Groq turns everyday context into reflections. A deterministic fallback keeps the experience useful when AI is unavailable.",
    tools: "GROQ · CONTEXT · FALLBACKS",
    label: "03 / THE INTELLIGENCE",
    detail: "Useful context. Thoughtful feedback.",
  },
  {
    title: "Meet Buddy.",
    em: "Made for life.",
    description:
      "The ideas become a product. Try the Planner and Reflections views in this interactive study, then explore the actual project below.",
    tools: "BUDDY / INTERACTIVE PRODUCT STUDY",
    label: "04 / THE PRODUCT",
    detail: "Your day, connected.",
  },
];
const clamp = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => {
  x = clamp(x);
  return x * x * (3 - 2 * x);
};
const range = (p, a, b) => ease((p - a) / (b - a));
export function createProductEngine(motionEnabled) {
  const $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)];
  const stage = $("#engine-stage"),
    pin = $(".cinema-pin"),
    section = $("#home"),
    visual = $("#story-visual"),
    play = $("#engine-play"),
    product = $("#product-film");
  const ideas = $$(".idea-word");
  let active = -1,
    progress = 0,
    target = 0,
    playing = false,
    raf = 0,
    last = 0,
    visible = true,
    pointerX = 0,
    pointerY = 0,
    dimensions = [],
    titleAnimation;
  let completed = new Set();
  function demo(tab) {
    $$("[data-buddy-tab]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.buddyTab === tab)),
    );
    const head = {
      overview: [
        "A little more<br /><em>room to breathe.</em>",
        "Your money, plans, and perspective. Finally, together.",
      ],
      planner: [
        "Make room for<br /><em>what matters.</em>",
        "A lighter plan. Tap a task to mark it complete.",
      ],
      insights: [
        "Small patterns.<br /><em>A clearer picture.</em>",
        "A sample reflection, with your everyday in context.",
      ],
    }[tab];
    $("#buddy-heading").innerHTML = head[0];
    $("#buddy-subtitle").textContent = head[1];
    $("#buddy-demo-content").innerHTML =
      tab === "overview"
        ? `<div class="buddy-metrics"><div class="buddy-metric"><span>THIS WEEK’S SPENDING</span><strong>₹2,450</strong><small>₹550 within your sample budget</small><div class="buddy-sample-chart">${[45, 70, 55, 90, 35, 60, 40].map((h) => `<i style="--h:${h}%"></i>`).join("")}</div></div><div class="buddy-metric"><span>A MORE INTENTIONAL DAY</span><strong>3 small wins</strong><small>Plan less. Do what matters.</small><div class="buddy-sample-chart">${[25, 40, 55, 65, 70, 85, 95].map((h) => `<i style="--h:${h}%"></i>`).join("")}</div></div></div><div class="buddy-reflection"><span>✳</span><p><small>THE BIGGER PICTURE</small>A little structure creates a little space.<br />Start with one thing that matters today.</p></div>`
        : tab === "planner"
          ? `<div class="buddy-task-list">${["Review this week’s spending", "Make time for a focused hour", "Reflect on one small win"].map((t, i) => `<button class="buddy-task" data-task="${i}" aria-pressed="${completed.has(i)}"><i>${completed.has(i) ? "✓" : ""}</i><span>${t}</span><small>${["09:00", "11:30", "18:00"][i]}</small></button>`).join("")}</div>`
          : `<div class="buddy-reflection"><span>✳</span><p><small>A MOMENT OF PERSPECTIVE / SAMPLE</small>When you plan a little less, you leave room for what matters most.</p></div><p class="buddy-insight-copy">Your spending, tasks, and mood can tell a connected story. Buddy brings those signals together to help you notice the pattern.</p><div class="buddy-insight-tags"><span>Money</span><span>Time</span><span>Wellbeing</span></div>`;
  }
  $$("[data-buddy-tab]").forEach((b) =>
    b.addEventListener("click", () => demo(b.dataset.buddyTab)),
  );
  $("#buddy-demo-content").addEventListener("click", (e) => {
    const b = e.target.closest("[data-task]");
    if (!b) return;
    const id = +b.dataset.task;
    completed.has(id) ? completed.delete(id) : completed.add(id);
    b.setAttribute("aria-pressed", String(completed.has(id)));
    b.querySelector("i").textContent = completed.has(id) ? "✓" : "";
  });
  demo("overview");
  function measure() {
    const v = visual.getBoundingClientRect();
    dimensions = ideas.map((el) => ({
      x: v.width * 0.515 - (el.offsetLeft + el.offsetWidth / 2),
      y: v.height * 0.495 - (el.offsetTop + el.offsetHeight / 2),
    }));
    paint();
  }
  function chapter(index) {
    if (active === index) return;
    active = index;
    stage.dataset.step = index;
    pin.dataset.chapter = index;
    $$("[data-engine-step]").forEach((b) =>
      b.setAttribute("aria-pressed", String(+b.dataset.engineStep === index)),
    );
    $("#engine-description").textContent = chapters[index].description;
    $("#engine-tools").textContent = chapters[index].tools;
    $("#cinema-scene-label").textContent = chapters[index].label;
    $("#cinema-scene-detail").textContent = chapters[index].detail;
    $("#film-title").textContent = chapters[index].title;
    $("#film-title-em").textContent = chapters[index].em;
    titleAnimation?.cancel();
    if (motionEnabled() && index !== 0)
      titleAnimation = $(".cinema-copy h1").animate(
        [
          { opacity: 0.1, transform: "translateY(12px)", filter: "blur(5px)" },
          { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
        ],
        { duration: 650, easing: "cubic-bezier(.22,1,.36,1)" },
      );
  }
  function paint() {
    const p = progress;
    $("#film-scrub").value = String(Math.round(p * 100));
    $("#film-scrub").style.setProperty("--film-progress", p);
    $("#film-scrub").setAttribute(
      "aria-valuetext",
      chapters[active < 0 ? 0 : active].label,
    );
    stage.dataset.progress = p.toFixed(3);
    chapter(p < 0.25 ? 0 : p < 0.53 ? 1 : p < 0.82 ? 2 : 3);
    const merge = range(p, 0.06, 0.32),
      vanish = 1 - range(p, 0.2, 0.35);
    ideas.forEach((el, i) => {
      const d = dimensions[i] || { x: 0, y: 0 };
      const local = range(p, 0.06 + i * 0.015, 0.32 + i * 0.015);
      el.style.transform = `translate3d(${d.x * local + pointerX * (i + 1) * 0.4}px,${d.y * local + pointerY * (i + 1) * 0.4}px,${-local * 180}px) scale(${1 - local * 0.65})`;
      el.style.opacity = vanish;
      el.style.filter = `blur(${merge * 3}px)`;
    });
    $(".idea-convergence").style.opacity =
      range(p, 0.15, 0.29) * (1 - range(p, 0.56, 0.7));
    $(".idea-convergence").style.transform =
      `scale(${0.85 + range(p, 0.2, 0.45) * 0.15})`;
    const stackIn = range(p, 0.31, 0.43),
      stackOut = 1 - range(p, 0.62, 0.73);
    $(".story-stack").style.opacity = stackIn * stackOut;
    $(".story-stack").style.transform = `translateY(${(1 - stackIn) * 24}px)`;
    stage.style.setProperty(
      "--paths-opacity",
      0.15 + range(p, 0.05, 0.32) * 0.75 - range(p, 0.55, 0.72) * 0.9,
    );
    stage.style.setProperty("--path-offset", 850 * (1 - range(p, 0.02, 0.39)));
    const reveal = range(p, 0.53, 0.84);
    product.style.opacity = reveal;
    product.style.transform = `translate3d(${(1 - reveal) * 70}px,${(1 - reveal) * 60}px,${(1 - reveal) * -180}px) rotateY(${(1 - reveal) * -28 + pointerX * 0.12 * reveal}deg) rotateX(${(1 - reveal) * 14 - pointerY * 0.1 * reveal}deg) scale(${0.72 + reveal * 0.28})`;
    const ready = p >= 0.82;
    product.inert = !ready;
    product.setAttribute("aria-hidden", String(!ready));
    product.dataset.interactive = String(ready);
    $(".buddy-sidebar").style.opacity = range(p, 0.59, 0.73);
    $(".buddy-main").style.opacity = range(p, 0.64, 0.8);
    $(".film-aura").style.transform =
      `translate(${pointerX}px,${pointerY}px) scale(${1 + p * 0.35})`;
    pin.dataset.progress = p.toFixed(3);
  }
  function tick(t) {
    raf = 0;
    const dt = Math.min(t - last, 60);
    last = t;
    if (playing) {
      target = clamp(target + dt / 15000);
      if (target === 1) stop(false);
    }
    progress = motionEnabled()
      ? progress + (target - progress) * 0.085
      : target;
    if (Math.abs(target - progress) < 0.0005) progress = target;
    paint();
    if (visible && !document.hidden && (playing || progress !== target))
      raf = requestAnimationFrame(tick);
  }
  function wake() {
    if (!raf && visible && !document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  }
  function select(value) {
    target = clamp(value);
    if (!motionEnabled()) {
      progress = target;
      paint();
    } else wake();
  }
  function stop(cancel = true) {
    playing = false;
    if (cancel) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    play.setAttribute("aria-pressed", "false");
    play.textContent = motionEnabled()
      ? "▶ Play the journey"
      : "→ Next chapter";
  }
  $$("[data-engine-step]").forEach((b) =>
    b.addEventListener("click", () => {
      stop();
      select([0, 0.39, 0.67, 1][+b.dataset.engineStep]);
    }),
  );
  play.addEventListener("click", () => {
    if (!motionEnabled()) {
      select([0, 0.39, 0.67, 1][(active + 1) % 4]);
      return;
    }
    if (playing) {
      stop();
      target = progress;
      return;
    }
    playing = true;
    target = progress = 0;
    paint();
    play.setAttribute("aria-pressed", "true");
    play.textContent = "Ⅱ Pause the journey";
    wake();
  });
  $("#film-scrub").addEventListener("input", (e) => {
    stop();
    select(+e.target.value / 100);
  });
  $("#engine-reset").addEventListener("click", () => {
    stop();
    pointerX = pointerY = 0;
    select(0);
  });
  let scrollFrame = 0;
  addEventListener(
    "scroll",
    () => {
      if (!motionEnabled() || scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        const r = section.getBoundingClientRect();
        if (r.top > 0 || r.bottom < 0) return;
        stop();
        select(
          Math.max(0, -r.top) /
            Math.max(1, section.offsetHeight - pin.offsetHeight),
        );
      });
    },
    { passive: true },
  );
  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (!visible) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else wake();
    },
    { threshold: 0.03 },
  );
  observer.observe(pin);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else wake();
  });
  pin.addEventListener("pointermove", (e) => {
    if (
      !motionEnabled() ||
      e.pointerType !== "mouse" ||
      e.target.closest("button,a,input")
    )
      return;
    const r = pin.getBoundingClientRect();
    pointerX = ((e.clientX - r.left) / r.width - 0.5) * 12;
    pointerY = ((e.clientY - r.top) / r.height - 0.5) * 8;
    paint();
  });
  pin.addEventListener("pointerleave", () => {
    pointerX = pointerY = 0;
    paint();
  });
  pin.addEventListener("pointerdown", (e) => {
    if (!motionEnabled() || e.target.closest("button,a,input")) return;
    const r = pin.getBoundingClientRect(),
      flash = document.createElement("span");
    flash.className = "film-touch";
    flash.style.left = e.clientX - r.left + "px";
    flash.style.top = e.clientY - r.top + "px";
    pin.append(flash);
    flash
      .animate(
        [
          { opacity: 0.4, transform: "translate(-50%,-50%) scale(.1)" },
          { opacity: 0, transform: "translate(-50%,-50%) scale(1)" },
        ],
        { duration: 850, easing: "ease-out" },
      )
      .finished.then(() => flash.remove());
  });
  new ResizeObserver(measure).observe(visual);
  measure();
  paint();
  return {
    setTheme() {},
    setMotion(value) {
      if (!value) {
        stop();
        titleAnimation?.cancel();
        progress = target;
        pointerX = pointerY = 0;
        paint();
      }
      play.textContent = value ? "▶ Play the journey" : "→ Next chapter";
    },
  };
}
