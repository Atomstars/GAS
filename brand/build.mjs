/*
 * GAS brand marks — generator.
 *
 *   node brand/build.mjs
 *
 * Every mark is drawn from one geometric alphabet (see GLYPH below), so tracking,
 * stroke weight, aperture angle and colour are all parametric: change a constant
 * here and re-run to regenerate every SVG in this folder.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_SVG = path.dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------
   THE SYSTEM
   One monoline alphabet. Cap height 100, stroke 13, round caps/joins.
   G is a pure circle (r 43.5) with a 45deg aperture.
   A is a 40:85 isoceles built on the same optical width.
   S is two tangent circles (r 22) stacked on the cap height.
   L/R = visual bounds in glyph space, stroke included.
------------------------------------------------------------------- */
const SW = 13;
const GLYPH = {
  G: { d: ['M93.5 50 A43.5 43.5 0 1 1 80.76 19.24', 'M50 50 H93.5'], L: 0, R: 100 },
  A: { d: ['M10 93 L50 8 L90 93', 'M24.1 63 H75.9'], L: 3.5, R: 96.5 },
  S: { d: ['M65.56 12.44 A22 22 0 1 0 50 50 A22 22 0 1 1 34.44 87.56'], L: 21.5, R: 78.5 },
};

/** Lay GAS out on a baseline; returns paths already translated + total width. */
function word(tracking = 26, letters = 'GAS') {
  let cursor = 0;
  const out = [];
  for (const ch of letters) {
    const g = GLYPH[ch];
    out.push({ tx: cursor - g.L, d: g.d, ch });
    cursor += (g.R - g.L) + tracking;
  }
  return { glyphs: out, w: cursor - tracking, h: 100 };
}


/* Bake x-offsets into path data. A translate() group would put each glyph in its
   own user space, so a userSpaceOnUse gradient would restart on every letter. */
const ARITY = { M: 2, L: 2, H: 1, V: 1, A: 7, C: 6, Z: 0 };
function shiftPath(d, tx) {
  if (!tx) return d;
  return d.replace(/([MLHVACZ])([^MLHVACZ]*)/g, (_, cmd, argstr) => {
    const n = ARITY[cmd];
    if (!n) return cmd;
    const a = argstr.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    const segs = [];
    for (let i = 0; i < a.length; i += n) {
      const g = a.slice(i, i + n);
      if (cmd === 'H') g[0] += tx;
      else if (cmd === 'A') g[5] += tx;
      else if (cmd === 'C') { g[0] += tx; g[2] += tx; g[4] += tx; }
      else if (cmd !== 'V') g[0] += tx;
      segs.push(g.map(round).join(' '));
    }
    return cmd + segs.join(' ');
  });
}

const strokeAttrs = (c) =>
  `fill="none" stroke="${c}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"`;

function drawWord(colour, tracking = 26) {
  const { glyphs, w } = word(tracking);
  const body = glyphs
    .map((g) => g.d.map((d) => `<path d="${shiftPath(d, g.tx)}"/>`).join(''))
    .join('');
  return { svg: `<g ${strokeAttrs(colour)}>${body}</g>`, w };
}

const round = (n) => (Math.round(n * 100) / 100).toString();

/* deterministic noise for the condensation particles */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const C = { cyan: '#00e5ff', violet: '#7b5cff', magenta: '#ff4dd8', ink: '#eaf0ff', void: '#010104' };

/* userSpaceOnUse throughout: an objectBoundingBox gradient is undefined on a
   zero-height bbox, which silently drops horizontal strokes (the G bar, the A
   crossbar). User space also lets one ramp run across a whole lockup. */
const GRAD_BRAND = (id, x1, y1, x2, y2) =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}"><stop offset="0" stop-color="${C.violet}"/><stop offset=".38" stop-color="${C.cyan}"/><stop offset=".74" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.magenta}"/></linearGradient>`;

/* ==================================================================
   ROUTE 01 — MOLECULE G
================================================================== */
function route01(mono, u = 'a') {
  const stroke = mono ? 'currentColor' : `url(#g01-${u})`;
  const nucleus = mono ? 'currentColor' : C.magenta;
  const sat = mono ? 'currentColor' : C.cyan;
  const defs = mono ? '' : `<defs>${GRAD_BRAND(`g01-${u}`, 0, 100, 110, -4)}</defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-7 -8 128 116" role="img" aria-label="GAS molecule monogram">${defs}
  <g ${strokeAttrs(stroke)}>${GLYPH.G.d.map((d) => `<path d="${d}"/>`).join('')}</g>
  <circle cx="50" cy="50" r="9.5" fill="${nucleus}"/>
  <circle cx="103.8" cy="28.3" r="6" fill="${sat}"${mono ? '' : ' opacity=".95"'}/>
</svg>`;
}

/* ==================================================================
   ROUTE 02 — GAS. PRIMARY WORDMARK
================================================================== */
function route02(mono, u = 'a') {
  const stroke = mono ? 'currentColor' : `url(#g02-${u})`;
  const dot = mono ? 'currentColor' : C.magenta;
  const { svg, w } = drawWord(stroke);
  const dx = w + 26;
  const defs = mono ? '' : `<defs>${GRAD_BRAND(`g02-${u}`, 0, 86, dx + 6.5, 14)}</defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-7 -7 ${round(dx + 8 + 14)} 114" role="img" aria-label="GAS wordmark">${defs}
  ${svg}
  <circle cx="${round(dx + 6.5)}" cy="93.5" r="6.5" fill="${dot}"/>
</svg>`;
}

/* ==================================================================
   ROUTE 03 — CONDENSATION
================================================================== */
function route03(mono, u = 'a') {
  const { glyphs, w } = word(30);
  const body = glyphs
    .map((g) => g.d.map((d) => `<path d="${shiftPath(d, g.tx)}"/>`).join(''))
    .join('');
  const stroke = mono ? 'currentColor' : `url(#g03-${u})`;
  const r = rng(20250727);
  let strays = '';
  for (let i = 0; i < 22; i++) {
    const x = r() * (w + 40) - 20;
    const y = -6 - Math.pow(r(), 1.7) * 52;
    const rad = 1.1 + r() * 1.7;
    const op = (0.18 + r() * 0.5).toFixed(2);
    strays += `<circle cx="${round(x)}" cy="${round(y)}" r="${round(rad)}" opacity="${op}"/>`;
  }
  const defs = `<defs>
    ${mono ? '' : GRAD_BRAND(`g03-${u}`, 0, 86, w, 14)}
    <linearGradient id="fadeUp03-${u}" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset=".18" stop-color="#fff" stop-opacity="0"/>
      <stop offset=".72" stop-color="#fff" stop-opacity="1"/>
    </linearGradient>
    <linearGradient id="fadeDown03-${u}" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0" stop-color="#fff" stop-opacity="1"/>
      <stop offset=".62" stop-color="#fff" stop-opacity="1"/>
      <stop offset=".9" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <pattern id="dots03-${u}" width="7.5" height="7.5" patternUnits="userSpaceOnUse">
      <circle cx="3.75" cy="3.75" r="1.75" fill="#fff"/>
    </pattern>
    <mask id="topFade03-${u}"><rect x="-30" y="-70" width="${round(w + 60)}" height="190" fill="url(#fadeDown03-${u})"/></mask>
    <mask id="solid03-${u}"><rect x="-30" y="-8" width="${round(w + 60)}" height="120" fill="url(#fadeUp03-${u})"/></mask>
    <mask id="dotted03-${u}"><rect x="-30" y="-70" width="${round(w + 60)}" height="190" fill="url(#dots03-${u})" mask="url(#topFade03-${u})"/></mask>
  </defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-24 -64 ${round(w + 48)} 176" role="img" aria-label="GAS condensation wordmark">${defs}
  <g ${strokeAttrs(stroke)} mask="url(#solid03-${u})">${body}</g>
  <g ${strokeAttrs(stroke)} mask="url(#dotted03-${u})">${body}</g>
  <g fill="${mono ? 'currentColor' : C.cyan}">${strays}</g>
</svg>`;
}

/* ==================================================================
   ROUTE 04 — RINGED G
================================================================== */
function route04(mono, u = 'a') {
  const letter = mono ? 'currentColor' : `url(#g04-${u})`;
  const ring = mono ? 'currentColor' : `url(#r04-${u})`;
  const defs = `<defs>
    ${mono ? '' : `<linearGradient id="g04-${u}" gradientUnits="userSpaceOnUse" x1="6" y1="100" x2="100" y2="0"><stop offset="0" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.ink}"/></linearGradient>
    <linearGradient id="r04-${u}" gradientUnits="userSpaceOnUse" x1="-22" y1="50" x2="122" y2="50"><stop offset="0" stop-color="${C.violet}"/><stop offset=".45" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.magenta}"/></linearGradient>`}
    <mask id="occl04-${u}">
      <rect x="-60" y="-60" width="240" height="240" fill="#fff"/>
      <g ${strokeAttrs('#000')} stroke-width="${SW + 9}">${GLYPH.G.d.map((d) => `<path d="${d}"/>`).join('')}</g>
    </mask>
  </defs>`;
  const ringBack = `<g transform="rotate(-18 50 50)" mask="url(#occl04-${u})"><ellipse cx="50" cy="50" rx="72" ry="22" fill="none" stroke="${ring}" stroke-width="6" opacity="${mono ? '.45' : '.62'}"/></g>`;
  const ringFront = `<g transform="rotate(-18 50 50)"><path d="M-22 50 A72 22 0 0 0 122 50" fill="none" stroke="${ring}" stroke-width="6" stroke-linecap="round"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-36 -20 172 140" role="img" aria-label="GAS ringed planet monogram">${defs}
  ${ringBack}
  <g ${strokeAttrs(letter)}>${GLYPH.G.d.map((d) => `<path d="${d}"/>`).join('')}</g>
  ${ringFront}
</svg>`;
}

/* ==================================================================
   ROUTE 05 — CONSTELLATION A  (six stars draw the A in AKASH)
================================================================== */
const STARS = [
  { x: 50, y: 8, r: 7.4, key: true },
  { x: 30.5, y: 55, r: 3.3 },
  { x: 69.5, y: 55, r: 3.3 },
  { x: 11, y: 100, r: 4.4 },
  { x: 89, y: 100, r: 4.4 },
  { x: 104, y: 20, r: 2.4, drift: true },
];
function sparkle(x, y, r) {
  const k = r * 0.28;
  return `M${round(x)} ${round(y - r)} C${round(x + k)} ${round(y - k)} ${round(x + k)} ${round(y - k)} ${round(x + r)} ${round(y)} C${round(x + k)} ${round(y + k)} ${round(x + k)} ${round(y + k)} ${round(x)} ${round(y + r)} C${round(x - k)} ${round(y + k)} ${round(x - k)} ${round(y + k)} ${round(x - r)} ${round(y)} C${round(x - k)} ${round(y - k)} ${round(x - k)} ${round(y - k)} ${round(x)} ${round(y - r)}Z`;
}
function route05(mono, u = 'a') {
  const line = mono ? 'currentColor' : C.ink;
  const star = mono ? 'currentColor' : C.ink;
  const hero = mono ? 'currentColor' : C.magenta;
  const segs = [
    'M50 8 L30.5 55 L11 100',
    'M50 8 L69.5 55 L89 100',
    'M30.5 55 L69.5 55',
  ];
  const dots = STARS.filter((s) => !s.key)
    .map((s) => `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="${s.drift ? (mono ? 'currentColor' : C.cyan) : star}" opacity="${s.drift ? '.85' : '1'}"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -8 128 124" role="img" aria-label="Six-star asterism forming the letter A">
  <g fill="none" stroke="${line}" stroke-width="1.1" stroke-linecap="round" opacity="${mono ? '.45' : '.32'}">${segs.map((d) => `<path d="${d}"/>`).join('')}</g>
  ${dots}
  <path d="${sparkle(50, 8, 9.5)}" fill="${hero}"/>
</svg>`;
}

/* ==================================================================
   ROUTE 06 — MISSION PATCH
================================================================== */
function route06(mono, u = 'a') {
  const ink = mono ? 'currentColor' : C.cyan;
  const soft = mono ? 'currentColor' : C.ink;
  const { svg: wm, w } = drawWord(mono ? 'currentColor' : `url(#g06-${u})`);
  const s = 0.4;
  const wmX = -(w * s) / 2;
  const stars6 = Array.from({ length: 6 }, (_, i) => {
    const a = (-90 + (i - 2.5) * 15) * (Math.PI / 180);
    return `<circle cx="${round(Math.cos(a) * 62)}" cy="${round(Math.sin(a) * 62)}" r="${i === 2 ? 3.4 : 2.2}" fill="${i === 2 ? (mono ? 'currentColor' : C.magenta) : soft}" opacity="${i === 2 ? 1 : 0.75}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-118 -118 236 236" role="img" aria-label="GAS mission patch emblem">
  <defs>
    ${mono ? '' : GRAD_BRAND(`g06-${u}`, 0, 86, w, 14)}
    <path id="arcTop06-${u}" d="M-94 0 A94 94 0 0 1 94 0"/>
    <path id="arcBot06-${u}" d="M-103 0 A103 103 0 0 0 103 0"/>
  </defs>
  <circle cx="0" cy="0" r="112" fill="none" stroke="${ink}" stroke-width="2.5" opacity=".9"/>
  <circle cx="0" cy="0" r="88" fill="none" stroke="${ink}" stroke-width="1" opacity=".38" stroke-dasharray="1.5 7"/>
  <g font-family="Syncopate, 'Arial Narrow', sans-serif" font-weight="700" fill="${soft}">
    <text font-size="8.2" letter-spacing="2.2"><textPath href="#arcTop06-${u}" startOffset="50%" text-anchor="middle">A JOURNEY THROUGH MY GALAXY</textPath></text>
    <text font-size="9.6" letter-spacing="3.2" opacity=".72"><textPath href="#arcBot06-${u}" startOffset="50%" text-anchor="middle">GOVADA · AKASH</textPath></text>
  </g>
  ${stars6}
  <g transform="translate(${round(wmX)} ${round(-50 * s + 8)}) scale(${s})">${wm}</g>
  <path d="M-74 54 A118 118 0 0 0 74 54" fill="none" stroke="${ink}" stroke-width="1.8" opacity=".45" stroke-linecap="round"/>
  <circle cx="0" cy="66.5" r="2.6" fill="${ink}" opacity=".55"/>
</svg>`;
}

/* ==================================================================
   CONSTRUCTION FIGURE (how the alphabet is built)
================================================================== */
function construction() {
  const guide = `stroke="${C.violet}" stroke-width="1" fill="none" opacity=".55"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-24 -22 340 144" role="img" aria-label="Construction grid for the GAS alphabet">
  <g ${guide} stroke-dasharray="3 5">
    <circle cx="50" cy="50" r="43.5"/>
    <path d="M-14 50 H114 M50 -14 V114"/>
    <path d="M50 50 L112 12"/>
    <circle cx="273.5" cy="28" r="22"/><circle cx="273.5" cy="72" r="22"/>
    <path d="M132.5 93 H212.5 M172.5 -6 V101"/>
  </g>
  <g ${strokeAttrs(C.ink)} opacity=".92">
    <g>${GLYPH.G.d.map((d) => `<path d="${d}"/>`).join('')}</g>
    <g transform="translate(122.5 0)">${GLYPH.A.d.map((d) => `<path d="${d}"/>`).join('')}</g>
    <g transform="translate(223.5 0)">${GLYPH.S.d.map((d) => `<path d="${d}"/>`).join('')}</g>
  </g>
  <g fill="${C.cyan}" font-family="Syncopate, sans-serif" font-size="7.5" letter-spacing="1.6">
    <text x="-20" y="-10">R 43.5</text>
    <text x="126" y="-10">40 : 85</text>
    <text x="222" y="-10">2 × R 22</text>
    <text x="-20" y="116">STROKE 13 · ROUND TERMINALS · CAP HEIGHT 100</text>
  </g>
</svg>`;
}

/* ================================================================== */
const ROUTES = [
  {
    id: 'molecule-g',
    n: '01',
    name: 'MOLECULE',
    kind: 'Single-letter mark',
    line: 'The G is the orbit. The dot at its heart is you — one molecule of gas.',
    body: `The circle is drawn once, at radius 43.5, and broken by a 45° aperture on the upper right. The bar runs from the exact centre out to the aperture, so the eye reads it as an escape route rather than a crossbar. A second molecule has already slipped through the gap. This is the mark that has to survive a browser tab, and it does: at 16px the ring and the nucleus are still two distinct shapes.`,
    use: ['Favicon', 'App icon', 'Loader'],
    fn: route01,
    pad: 46,
  },
  {
    id: 'wordmark',
    n: '02',
    name: 'GAS.',
    kind: 'Primary wordmark',
    line: 'The workhorse. Three letters, one geometry, a full stop that is also a particle.',
    body: `Every curve here comes from the same construction as route 01 — nothing is a typeface, so nothing shifts when a font fails to load. The full stop is lifted straight out of your own copy: “Got an idea? Let's give it GAS.” It sits on the baseline at the same weight as the stroke, so it reads as punctuation up close and as a trailing molecule from across a room.`,
    use: ['Site header', 'README', 'Signature', 'Print'],
    fn: route02,
    pad: 30,
  },
  {
    id: 'condensation',
    n: '03',
    name: 'CONDENSATION',
    kind: 'Display wordmark',
    line: 'Matter at the baseline, gas at the top. The logo is the site’s opening shot, frozen.',
    body: `Your intro canvas already condenses the word GAS out of drifting particles. This makes that permanent: the letters are solid where they meet the baseline and break into a particle field as they rise, with a few molecules that never joined. It is the most expressive route and the least portable — it wants size and dark ground. Pair it with route 02 for everything small.`,
    use: ['Hero title', 'Poster', 'Opening frame', 'Social card'],
    fn: route03,
    pad: 26,
  },
  {
    id: 'ringed-g',
    n: '04',
    name: 'RINGED',
    kind: 'Single-letter mark',
    line: 'The same G, wearing a ring. The route passes in front of the planet, and behind it.',
    body: `One ellipse, tilted 18°, crossing the letter. The back half is masked out by the letterform itself so the ring genuinely passes behind the G — the depth is real geometry, not a drawn illusion. Warmer and more illustrative than route 01, and the one that most obviously says “galaxy” without a single star in it. It needs a little more room to breathe than the molecule.`,
    use: ['Sticker', 'Avatar', 'Watermark', 'Loading state'],
    fn: route04,
    pad: 34,
  },
  {
    id: 'constellation',
    n: '05',
    name: 'ASTERISM',
    kind: 'Letterless emblem',
    line: 'Six stars — one per project — and the shape they draw is the A in Akash.',
    body: `The only route with no letterform at all, and the one carrying the most meaning: six nodes for the six project stars on your route, joined into the constellation of an A. The sixth star has drifted off the shape, which is the one you have not built yet. Add a seventh project and the mark can grow. Use it beside the wordmark, never instead of it.`,
    use: ['Avatar', 'Section motif', 'Endplate', 'Merch'],
    fn: route05,
    pad: 44,
  },
  {
    id: 'mission-patch',
    n: '06',
    name: 'MISSION PATCH',
    kind: 'Badge lockup',
    line: 'Flight-crew insignia. The wordmark, the six stars, the horizon, and your name on the rim.',
    body: `Built the way a real mission patch is: a hard outer rim, a dashed orbit inside it, the crew name on the lower arc and the mission on the upper. The six stars arc over the wordmark, one lit magenta. This is the route that turns the identity into an object — the one people put on a laptop. It is deliberately the least flexible: it works at avatar size and above, and nowhere near a nav bar.`,
    use: ['GitHub avatar', 'Stickers', 'Merch', 'Credits frame'],
    fn: route06,
    pad: 12,
  },
];

/* ---------- write SVG assets ---------- */
let written = 0;
for (const r of ROUTES) {
  fs.writeFileSync(path.join(OUT_SVG, `gas-${r.id}.svg`), r.fn(false, 'x') + '\n');
  fs.writeFileSync(path.join(OUT_SVG, `gas-${r.id}-mono.svg`), r.fn(true, 'x') + '\n');
  written += 2;
}
fs.writeFileSync(path.join(OUT_SVG, 'gas-construction.svg'), construction() + '\n');
written++;
console.log(`wrote ${written} svg files to ${OUT_SVG}`);
