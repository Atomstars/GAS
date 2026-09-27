const mapLabels = {
  gmat: { edges: ["HTTP", "LOOKUP", "CONTEXT", "JSON"] },
  buddy: { edges: ["SIGNALS", "CONTEXT", "PROMPT", "JSON"] },
  moneyfest: { edges: ["INPUT", "GATE", "CLAIMS", "RESULT"] },
};
export function setMapLabels(id) {
  document.querySelector("#system-map").dataset.route = id;
}
export function nodeIcon(i, id = "gmat") {
  const shapes = [
    '<rect x="4" y="5" width="32" height="22" rx="3"/><path d="M14 33h12M20 27v6M9 11h22"/>',
    '<rect x="7" y="4" width="26" height="12" rx="3"/><rect x="7" y="23" width="26" height="12" rx="3"/><path d="M12 10h1m4 0h10M12 29h1m4 0h10M20 16v7"/>',
    '<ellipse cx="20" cy="8" rx="13" ry="5"/><path d="M7 8v22c0 7 26 7 26 0V8M7 19c0 7 26 7 26 0"/>',
    '<rect x="10" y="10" width="20" height="20" rx="4"/><path d="M15 3v7m10-7v7M15 30v7m10-7v7M3 15h7m-7 10h7m20-10h7m-7 10h7M16 20l3 3 6-7"/>',
    '<rect x="5" y="6" width="30" height="25" rx="4"/><path d="M12 17l6 6 11-11M15 36h10"/>',
  ];
  if (id === "buddy" && i === 2)
    shapes[2] =
      '<path d="M10 6h20v28H10Z M15 13h10M15 20h10M15 27h6M6 10v28h20"/>';
  if (id === "moneyfest" && i === 0)
    shapes[0] = '<path d="M6 33h28M10 28V17m10 11V7m10 21V12M7 10l9-6"/>';
  if (id === "moneyfest" && i === 2) shapes[2] = shapes[3];
  if (id === "moneyfest" && i === 3)
    shapes[3] =
      '<path d="M20 3l14 6v11c0 8-14 16-14 16S6 28 6 20V9Z M12 19l6 6 10-12"/>';
  return `<svg viewBox="0 0 40 40" aria-hidden="true">${shapes[i]}</svg>`;
}
export function drawSystemMap(active = 0, playing = false) {
  const map = document.querySelector("#system-map"),
    svg = document.querySelector("#map-connections");
  if (!map || !svg) return;
  const bounds = map.getBoundingClientRect();
  if (!bounds.width) return;
  const nodes = [...map.querySelectorAll("[data-node]")].map((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x - bounds.x, y: r.y - bounds.y, w: r.width, h: r.height };
  });
  if (nodes.length !== 5) return;
  svg.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
  const paths = [];
  // Connections follow actual rendered node positions at every viewport size.
  const p = (n, side) =>
    side === "bottom"
      ? [n.x + n.w / 2, n.y + n.h]
      : side === "top"
        ? [n.x + n.w / 2, n.y]
        : side === "right"
          ? [n.x + n.w, n.y + n.h / 2]
          : [n.x, n.y + n.h / 2];
  for (let i = 0; i < 4; i++) {
    let a, b, d;
    const from = nodes[i],
      to = nodes[i + 1];
    const horizontal = Math.abs(from.y - to.y) < 8;
    if (horizontal) {
      a = p(from, "right");
      b = p(to, "left");
      d = `M${a} H${b[0]}`;
    } else {
      a = p(from, "bottom");
      b = p(to, "top");
      d = `M${a} V${(a[1] + b[1]) / 2} H${b[0]} V${b[1]}`;
    }
    const labels = mapLabels[map.dataset.route || "gmat"].edges;
    const lx = horizontal ? (a[0] + b[0]) / 2 : a[0] + 10,
      ly = horizontal ? a[1] - 9 : (a[1] + b[1]) / 2 + 2;
    const label = `<text x="${lx}" y="${ly}" class="wire-label" text-anchor="${horizontal ? "middle" : "start"}">${labels[i]}</text>`;
    const current = i === active;
    paths.push(
      `<path id="signal-${i}" d="${d}" class="map-wire ${i < active ? "traversed" : ""} ${current ? "current" : ""}" marker-end="url(#wire-arrow)"/>${label}${playing && current ? `<circle r="4" class="signal-packet"><animateMotion dur="1.7s" repeatCount="indefinite" path="${d}"/></circle>` : ""}`,
    );
  }
  svg.innerHTML = `<defs><marker id="wire-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5 0 10" fill="none" stroke="currentColor" stroke-width="2"/></marker></defs>${paths.join("")}`;
}
