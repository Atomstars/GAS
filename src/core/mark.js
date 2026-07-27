/* ==================================================================
   THE GAS MARK — drawn, not extruded from a typeface.

   A geometric G: one circle, one gap, one bar. The gap is on the right
   where a G's aperture belongs, and the bar reaches back in from it.
   Monoline, single weight, no ornament — so it survives at 16px in a
   browser tab, which is the actual test a logo has to pass.

   Inside sits one atom. At rest it sits still at the centre of the
   vessel. Given energy it orbits, and at full energy it breaks the
   ring and runs free. Solid, liquid, gas — the whole brand idea in
   one moving dot, and nothing else in the mark has to move.

   Built as SVG so the header stays razor sharp at any size, and
   exported as plain geometry the 3D title can extrude from the same
   drawing — one mark, two renderers, no drift between them.
================================================================== */

export const MARK_VIEWBOX = 100;
const R = 33;          // ring radius
const W = 9.5;         // stroke weight
const GAP_DEG = 34;    // aperture, in degrees, centred on the right

const rad = d => (d * Math.PI) / 180;
const px = a => 50 + R * Math.cos(rad(a));
const py = a => 50 - R * Math.sin(rad(a));

/* The arc runs from just below the aperture, all the way round, to just
   above it — counter-clockwise, so the terminal lands where the bar
   meets it. */
const A0 = -GAP_DEG / 2;
const A1 = GAP_DEG / 2;

export function markSVG({
  stroke = 'currentColor',
  atomId = 'gas-atom',
  ringId = 'gas-ring',
} = {}) {
  const x0 = px(A0).toFixed(2), y0 = py(A0).toFixed(2);
  const x1 = px(A1).toFixed(2), y1 = py(A1).toFixed(2);

  /* large-arc = 1 because we take the long way round the circle */
  const arc = `M ${x1} ${y1} A ${R} ${R} 0 1 0 ${x0} ${y0}`;

  /* the bar: in from the lower terminal, stopping short of centre so the
     counter stays open — a bar that reaches the middle closes the G */
  const barX = 50 + R * 0.02;
  const bar = `M ${x0} ${y0} L ${barX.toFixed(2)} ${y0}`;

  return `
<svg viewBox="0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}" fill="none" aria-label="GAS">
  <g id="${ringId}" stroke="${stroke}" stroke-width="${W}" stroke-linecap="round">
    <path d="${arc}" />
    <path d="${bar}" />
  </g>
  <circle id="${atomId}" cx="50" cy="50" r="${(W * 0.72).toFixed(2)}" fill="${stroke}" />
</svg>`.trim();
}

/* The same drawing as numbers, so the 3D title can build real geometry
   from it instead of a second, slightly different mark. */
export const MARK_SPEC = {
  radius: R,
  weight: W,
  gapDeg: GAP_DEG,
  arcStart: A1,
  arcEnd: A0 + 360,
  atomRadius: W * 0.72,
  barFrom: [px(A0), py(A0)],
  barTo: [50 + R * 0.02, py(A0)],
};

/* Drive the atom from an energy value: still when cold, orbiting when
   warm, wide and fast when hot. The ring never moves — a logo whose
   frame wanders is a logo you cannot place. */
export function atomAt(energy, t) {
  const orbit = R * 0.52 * energy;
  const speed = 0.5 + energy * 2.4;
  return {
    cx: 50 + Math.cos(t * speed) * orbit,
    cy: 50 + Math.sin(t * speed * 1.15) * orbit * 0.82,
  };
}
