import { createProductEngine } from "./productEngine.js";
import { createIdentity } from "./identity.js";
export function createExperience(motionEnabled) {
  const $ = (s) => document.querySelector(s);
  const identity = createIdentity();
  const engine = createProductEngine(motionEnabled);
  const root = document.documentElement;
  let transition = null,
    timer,
    lampTimer;
  function applyTheme(value) {
    root.dataset.theme = value;
    $("#theme-command").dataset.lit = String(value === "light");
    $('meta[name="theme-color"]').content =
      value === "dark" ? "#0b0d0e" : "#f0f0eb";
    try {
      localStorage.setItem("gas-theme", value);
    } catch {}
    $("#theme-input").value = value === "dark" ? "lights.on()" : "lights.off()";
    identity.refresh();
    engine.setTheme(value);
  }
  applyTheme(root.dataset.theme === "light" ? "light" : "dark");
  async function changeTheme(value) {
    transition?.skipTransition();
    const bounds = $("#theme-command button").getBoundingClientRect();
    const x = bounds.left + bounds.width / 2,
      y = bounds.top + bounds.height / 2;
    root.style.setProperty("--light-x", `${x}px`);
    root.style.setProperty("--light-y", `${y}px`);
    const radius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y),
    );
    if (motionEnabled() && document.startViewTransition) {
      const current = document.startViewTransition(() => applyTheme(value));
      transition = current;
      try {
        await current.ready;
        if (motionEnabled())
          await root.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${radius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 1050,
              easing: "cubic-bezier(.22,1,.36,1)",
              pseudoElement: "::view-transition-new(root)",
            },
          ).finished;
      } catch {
      } finally {
        if (transition === current) transition = null;
      }
    } else {
      applyTheme(value);
      if (motionEnabled()) {
        const halo = document.createElement("div");
        halo.className = "lighting-halo";
        document.body.append(halo);
        halo
          .animate(
            [
              { opacity: 0.4, transform: "scale(.01)" },
              { opacity: 0, transform: "scale(1)" },
            ],
            { duration: 850, easing: "ease-out" },
          )
          .finished.finally(() => halo.remove());
      }
    }
  }
  $("#theme-command").addEventListener("submit", (e) => {
    e.preventDefault();
    const value = { "lights.on()": "light", "lights.off()": "dark" }[
      $("#theme-input").value.trim().toLowerCase()
    ];
    clearTimeout(timer);
    if (!value) {
      $("#theme-input").setAttribute("aria-invalid", "true");
      $("#theme-feedback").textContent = "Use lights.on() or lights.off().";
      $("#theme-input").focus();
      return;
    }
    $("#theme-input").removeAttribute("aria-invalid");
    clearTimeout(lampTimer);
    $("#theme-command").classList.remove("executing");
    void $("#theme-command").offsetWidth;
    $("#theme-command").classList.add("executing");
    lampTimer = setTimeout(
      () => $("#theme-command").classList.remove("executing"),
      950,
    );
    changeTheme(value);
    $("#theme-feedback").textContent =
      value === "dark" ? "Studio lighting off." : "Studio lighting on.";
    timer = setTimeout(() => ($("#theme-feedback").textContent = ""), 3000);
  });
  return {
    setMotion(value) {
      if (!value) {
        transition?.skipTransition();
        document
          .getAnimations()
          .filter((a) =>
            a.effect?.pseudoElement?.startsWith("::view-transition"),
          )
          .forEach((a) => a.cancel());
      }
      engine.setMotion(value);
    },
  };
}
