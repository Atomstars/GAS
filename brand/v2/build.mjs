/*
 * GAS brand marks — round 2.
 *
 *   node brand/v2/build.mjs
 *
 * Round 1 was built on a circular G with a centre bar. That is Google's mark,
 * so the skeleton is replaced: every letter here is a 100 x 100 square with
 * 15-unit corners, stroked at 22 with butt caps and mitre joins. The G's
 * aperture is a flat notch cut into the right edge, not a gap in a ring.
 *
 * These are for a company that builds websites, apps and systems, so the marks
 * are flat colour (no gradients), carry no space imagery, and every one of them
 * survives being printed in a single ink.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.dirname(fileURLToPath(import.meta.url));

const round = (n) => (Math.round(n * 100) / 100).toString();

/* ------------------------------------------------------------------
   THE ALPHABET — three 100 x 100 squares
------------------------------------------------------------------- */
const SW = 22;
const GLYPH = {
  G: ['M89 38 V26 A15 15 0 0 0 74 11 H26 A15 15 0 0 0 11 26 V74 A15 15 0 0 0 26 89 H74 A15 15 0 0 0 89 74 V62 H62'],
  A: ['M11 100 V34 A23 23 0 0 1 34 11 H66 A23 23 0 0 1 89 34 V100', 'M11 63 H89'],
  S: ['M89 11 H26 A15 15 0 0 0 11 26 V39 A15 15 0 0 0 26 54 H74 A15 15 0 0 1 89 69 V74 A15 15 0 0 1 74 89 H11'],
  /* the A with its crossbar removed reads as a lift arrow */
  CHEV: ['M11 100 L50 22 L89 100'],
};

const ARITY = { M: 2, L: 2, H: 1, V: 1, A: 7, C: 6, Z: 0 };
function shiftPath(d, tx, ty = 0) {
  if (!tx && !ty) return d;
  return d.replace(/([MLHVACZ])([^MLHVACZ]*)/g, (_, cmd, argstr) => {
    const n = ARITY[cmd];
    if (!n) return cmd;
    const a = argstr.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    const segs = [];
    for (let i = 0; i < a.length; i += n) {
      const g = a.slice(i, i + n);
      if (cmd === 'H') g[0] += tx;
      else if (cmd === 'V') g[0] += ty;
      else if (cmd === 'A') { g[5] += tx; g[6] += ty; }
      else if (cmd === 'C') { g[0] += tx; g[1] += ty; g[2] += tx; g[3] += ty; g[4] += tx; g[5] += ty; }
      else { g[0] += tx; g[1] += ty; }
      segs.push(g.map(round).join(' '));
    }
    return cmd + segs.join(' ');
  });
}

const TRACK = 20;
/** GAS on a baseline; every letter is 100 wide, so the maths stays whole. */
function word(letters = ['G', 'A', 'S'], track = TRACK) {
  const paths = [];
  letters.forEach((ch, i) => {
    const tx = i * (100 + track);
    GLYPH[ch].forEach((d) => paths.push(shiftPath(d, tx)));
  });
  return { paths, w: letters.length * 100 + (letters.length - 1) * track, h: 100 };
}

const stroked = (colour, extra = '') =>
  `fill="none" stroke="${colour}" stroke-width="${SW}" stroke-linecap="butt" stroke-linejoin="miter" ${extra}`;

const C = { cyan: '#00e5ff', violet: '#7b5cff', magenta: '#ff4dd8', ink: '#eaf0ff', void: '#010104' };

/* ==================================================================
   01 BLOCK — the workhorse logotype
================================================================== */
function block(mono) {
  const { paths, w } = word();
  const ink = mono ? 'currentColor' : C.ink;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 ${w + 12} 112" role="img" aria-label="GAS logotype">
  <g ${stroked(ink)}>${paths.map((d) => `<path d="${d}"/>`).join('')}</g>
</svg>`;
}

/* ==================================================================
   02 SLAB — knocked out of a solid bar
================================================================== */
function slab(mono, u = 'a') {
  const { paths, w } = word();
  const fill = mono ? 'currentColor' : C.cyan;
  const px = 34, py = 28;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-px - 4} ${-py - 4} ${w + px * 2 + 8} ${100 + py * 2 + 8}" role="img" aria-label="GAS in a solid bar">
  <defs><mask id="slab-${u}">
    <rect x="${-px}" y="${-py}" width="${w + px * 2}" height="${100 + py * 2}" rx="26" fill="#fff"/>
    <g ${stroked('#000')}>${paths.map((d) => `<path d="${d}"/>`).join('')}</g>
  </mask></defs>
  <rect x="${-px}" y="${-py}" width="${w + px * 2}" height="${100 + py * 2}" rx="26" fill="${fill}" mask="url(#slab-${u})"/>
</svg>`;
}

/* ==================================================================
   03 TILE — the app icon
================================================================== */
function tile(mono, u = 'a') {
  const fill = mono ? 'currentColor' : C.cyan;
  const S = 200, o = 50;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" role="img" aria-label="GAS app tile">
  <defs><mask id="tile-${u}">
    <rect width="${S}" height="${S}" rx="46" fill="#fff"/>
    <g ${stroked('#000')}>${GLYPH.G.map((d) => `<path d="${shiftPath(d, o, o)}"/>`).join('')}</g>
  </mask></defs>
  <rect width="${S}" height="${S}" rx="46" fill="${fill}" mask="url(#tile-${u})"/>
</svg>`;
}

/* ==================================================================
   04 LIFT — the A becomes an upward chevron
================================================================== */
function lift(mono) {
  const w = 3 * 100 + 2 * TRACK;
  const ink = mono ? 'currentColor' : C.ink;
  const acc = mono ? 'currentColor' : C.cyan;
  const rest = [...GLYPH.G, ...GLYPH.S.map((d) => shiftPath(d, 2 * (100 + TRACK)))];
  const chev = GLYPH.CHEV.map((d) => shiftPath(d, 100 + TRACK));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 ${w + 12} 112" role="img" aria-label="GAS with a lift chevron">
  <g ${stroked(ink)}>${rest.map((d) => `<path d="${d}"/>`).join('')}</g>
  <g ${stroked(acc)}>${chev.map((d) => `<path d="${d}"/>`).join('')}</g>
</svg>`;
}

/* ==================================================================
   05 THROTTLE — leaned forward, with trails
================================================================== */
function throttle(mono, u = 'a') {
  const { paths, w } = word();
  const ink = mono ? 'currentColor' : C.ink;
  const acc = mono ? 'currentColor' : C.cyan;
  const bars = [
    { y: 14, len: 78 },
    { y: 44, len: 52 },
    { y: 74, len: 30 },
  ]
    .map((b) => `<rect x="${-b.len - 34}" y="${b.y}" width="${b.len}" height="12" rx="6" fill="${acc}" opacity="${mono ? '.5' : '.9'}"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-136 -8 ${w + 160} 116" role="img" aria-label="GAS leaning forward with motion trails">
  <g transform="skewX(-11)">
    ${bars}
    <g ${stroked(ink)}>${paths.map((d) => `<path d="${d}"/>`).join('')}</g>
  </g>
</svg>`;
}

/* ==================================================================
   06 INLINE — a hairline knocked out of every stroke
================================================================== */
function inline(mono, u = 'a') {
  const { paths, w } = word();
  const ink = mono ? 'currentColor' : C.ink;
  const body = paths.map((d) => `<path d="${d}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 ${w + 12} 112" role="img" aria-label="GAS with an inline">
  <defs><mask id="inl-${u}">
    <rect x="-10" y="-10" width="${w + 20}" height="120" fill="#fff"/>
    <g fill="none" stroke="#000" stroke-width="6" stroke-linecap="butt" stroke-linejoin="miter">${body}</g>
  </mask></defs>
  <g ${stroked(ink)} mask="url(#inl-${u})">${body}</g>
</svg>`;
}

/* ==================================================================
   07 BRACKET — the studio lockup
================================================================== */
function bracket(mono) {
  const { paths, w } = word();
  const ink = mono ? 'currentColor' : C.ink;
  const acc = mono ? 'currentColor' : C.cyan;
  const gap = 46, arm = 40;
  const L = -gap - arm, R = w + gap + arm;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${L - 20} -8 ${R - L + 40} 116" role="img" aria-label="GAS in angle brackets">
  <g fill="none" stroke="${acc}" stroke-width="16" stroke-linecap="square" stroke-linejoin="miter" opacity="${mono ? '.55' : '1'}">
    <path d="M${-gap} 18 L${L} 50 L${-gap} 82"/>
    <path d="M${w + gap} 18 L${R} 50 L${w + gap} 82"/>
  </g>
  <g ${stroked(ink)}>${paths.map((d) => `<path d="${d}"/>`).join('')}</g>
</svg>`;
}

/* ==================================================================
   08 STACK — the vertical spine lockup
================================================================== */
function stack(mono) {
  const ink = mono ? 'currentColor' : C.ink;
  const acc = mono ? 'currentColor' : C.cyan;
  const s = 0.62, step = 76;
  const rows = ['G', 'A', 'S']
    .map((ch, i) => `<g transform="translate(0 ${i * step}) scale(${s})">${GLYPH[ch].map((d) => `<path d="${d}"/>`).join('')}</g>`)
    .join('');
  const h = step * 2 + 100 * s;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-42 -8 ${100 * s + 56} ${h + 16}" role="img" aria-label="GAS stacked lockup">
  <rect x="-30" y="0" width="8" height="${round(h)}" rx="4" fill="${acc}"/>
  <g fill="none" stroke="${ink}" stroke-width="${SW}" stroke-linecap="butt" stroke-linejoin="miter" vector-effect="none">
    <g transform="scale(1)">${rows}</g>
  </g>
</svg>`;
}

/* ==================================================================
   09 CHEVRON — letterless, accelerating
================================================================== */
function chevron(mono) {
  const acc = mono ? 'currentColor' : C.cyan;
  const ink = mono ? 'currentColor' : C.ink;
  const specs = [
    { x: 0, w: 10, o: 0.3, c: ink },
    { x: 32, w: 14, o: 0.6, c: ink },
    { x: 68, w: 19, o: 1, c: acc },
  ];
  const body = specs
    .map((s) => `<path d="M${s.x} 12 L${s.x + 26} 50 L${s.x} 88" fill="none" stroke="${s.c}" stroke-width="${s.w}" stroke-linecap="square" stroke-linejoin="miter" opacity="${s.o}"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 0 120 100" role="img" aria-label="Three accelerating chevrons">${body}</svg>`;
}

/* ==================================================================
   10 GRID — built from modules
================================================================== */
const BITMAP = {
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
};
function grid(mono) {
  const ink = mono ? 'currentColor' : C.ink;
  const acc = mono ? 'currentColor' : C.cyan;
  const pitch = 15, sq = 13, r = 3.5, adv = 5 * pitch + 22;
  let cells = '';
  ['G', 'A', 'S'].forEach((ch, li) => {
    BITMAP[ch].forEach((row, y) => {
      [...row].forEach((c, x) => {
        if (c !== '#') return;
        const cx = li * adv + x * pitch;
        const cy = y * pitch;
        const hot = li === 0 && y === 3 && x === 4;
        cells += `<rect x="${cx}" y="${cy}" width="${sq}" height="${sq}" rx="${r}" fill="${hot ? acc : ink}"/>`;
      });
    });
  });
  const w = 2 * adv + 5 * pitch - (pitch - sq);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 ${w + 12} ${7 * pitch - (pitch - sq) + 12}" role="img" aria-label="GAS built from modular squares">${cells}</svg>`;
}

/* ================================================================== */
export const ROUTES = [
  { id: 'block',    n: '01', name: 'BLOCK',    fn: block },
  { id: 'slab',     n: '02', name: 'SLAB',     fn: slab },
  { id: 'tile',     n: '03', name: 'TILE',     fn: tile },
  { id: 'lift',     n: '04', name: 'LIFT',     fn: lift },
  { id: 'throttle', n: '05', name: 'THROTTLE', fn: throttle },
  { id: 'inline',   n: '06', name: 'INLINE',   fn: inline },
  { id: 'bracket',  n: '07', name: 'BRACKET',  fn: bracket },
  { id: 'stack',    n: '08', name: 'STACK',    fn: stack },
  { id: 'chevron',  n: '09', name: 'CHEVRON',  fn: chevron },
  { id: 'grid',     n: '10', name: 'GRID',     fn: grid },
];

if (process.argv[1] && process.argv[1].endsWith('build.mjs')) {
  let n = 0;
  for (const r of ROUTES) {
    fs.writeFileSync(path.join(OUT, `gas-${r.id}.svg`), r.fn(false, 'x') + '\n');
    fs.writeFileSync(path.join(OUT, `gas-${r.id}-mono.svg`), r.fn(true, 'x') + '\n');
    n += 2;
  }
  console.log(`wrote ${n} svg files to ${OUT}`);
}
