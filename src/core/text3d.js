import * as THREE from 'three';
import * as opentype from 'opentype.js';

/* ==================================================================
   REAL LETTERFORMS
   Type in this film is geometry, not a texture and not a cloud of
   points. Outlines come from the font itself, so an edge stays a
   mathematically sharp edge no matter how close the camera gets.
================================================================== */

let _font = null;

export async function loadFont() {
  if (_font) return _font;
  const b64 = window.__GAS_FONT_B64;
  let buf;
  if (b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    buf = bytes.buffer;
  } else {
    buf = await fetch('/fonts/Syncopate-Bold.ttf').then(r => r.arrayBuffer());
  }
  _font = opentype.parse(buf);
  return _font;
}

function commandsToContours(path, s) {
  const contours = [];
  let cur = null;
  for (const c of path.commands) {
    switch (c.type) {
      case 'M':
        cur = new THREE.Path();
        cur.moveTo(c.x * s, -c.y * s);      // opentype is y-down, three is y-up
        contours.push(cur);
        break;
      case 'L': cur.lineTo(c.x * s, -c.y * s); break;
      case 'Q': cur.quadraticCurveTo(c.x1 * s, -c.y1 * s, c.x * s, -c.y * s); break;
      case 'C': cur.bezierCurveTo(c.x1 * s, -c.y1 * s, c.x2 * s, -c.y2 * s, c.x * s, -c.y * s); break;
      case 'Z': cur.closePath(); break;
    }
  }
  return contours;
}

function pointInPolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if (((yi > pt.y) !== (yj > pt.y)) &&
        (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi + 1e-12) + xi)) inside = !inside;
  }
  return inside;
}

/* Counters — the hole in an A, the bowl of a P — arrive as separate
   closed contours. Even-odd containment says which are holes. */
function contoursToShapes(contours, res) {
  const sampled = contours.map(c => c.getPoints(res));
  const isHole = contours.map((_, i) => {
    let depth = 0;
    for (let j = 0; j < contours.length; j++) {
      if (i !== j && pointInPolygon(sampled[i][0], sampled[j])) depth++;
    }
    return depth % 2 === 1;
  });

  const shapes = [];
  contours.forEach((c, i) => {
    if (isHole[i]) return;
    const shape = new THREE.Shape(sampled[i]);
    contours.forEach((_, j) => {
      if (i !== j && isHole[j] && pointInPolygon(sampled[j][0], sampled[i])) {
        shape.holes.push(new THREE.Path(sampled[j]));
      }
    });
    shapes.push(shape);
  });
  return shapes;
}

/* `quality` trades vertices for fidelity — the title is seen from
   inches away and deserves everything; a project name across the room
   does not. */
export function makeTextGeometry(text, {
  width = 30,
  depth = 3.4,
  quality = 'high',
  center = true,
} = {}) {
  const Q = quality === 'high'
    ? { curve: 22, bevelSeg: 6,  bevelT: 0.42, bevelS: 0.34, res: 64 }
    : quality === 'mid'
    ? { curve: 10, bevelSeg: 3,  bevelT: 0.20, bevelS: 0.16, res: 32 }
    : { curve: 5,  bevelSeg: 2,  bevelT: 0.12, bevelS: 0.09, res: 20 };

  const path = _font.getPath(text, 0, 0, 100);
  const bb = path.getBoundingBox();
  const scale = width / Math.max(1e-6, bb.x2 - bb.x1);

  const shapes = contoursToShapes(commandsToContours(path, scale), Q.res);

  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth,
    curveSegments: Q.curve,
    bevelEnabled: true,
    bevelThickness: Q.bevelT * (depth / 3.4),
    bevelSize: Q.bevelS * (width / 30),
    bevelOffset: 0,
    bevelSegments: Q.bevelSeg,
  });
  if (center) geo.center();
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  return geo;
}

/* Sample points on the surface of a geometry — used to seed the gas
   particles so they condense onto the exact solid they become. */
export function sampleSurface(geometry, count) {
  const pos = geometry.attributes.position;
  const idx = geometry.index;
  const out = new Float32Array(count * 3);

  const triCount = idx ? idx.count / 3 : pos.count / 3;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();

  /* area-weighted so large faces are not under-represented */
  const areas = new Float32Array(triCount);
  let total = 0;
  for (let t = 0; t < triCount; t++) {
    const i0 = idx ? idx.getX(t * 3) : t * 3;
    const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    const ar = b.clone().sub(a).cross(c.clone().sub(a)).length() * 0.5;
    areas[t] = ar; total += ar;
  }
  const cdf = new Float32Array(triCount);
  let run = 0;
  for (let t = 0; t < triCount; t++) { run += areas[t] / total; cdf[t] = run; }

  const pick = () => {
    const r = Math.random();
    let lo = 0, hi = triCount - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] < r) lo = m + 1; else hi = m; }
    return lo;
  };

  for (let i = 0; i < count; i++) {
    const t = pick();
    const i0 = idx ? idx.getX(t * 3) : t * 3;
    const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    let u = Math.random(), v = Math.random();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    out[i * 3]     = a.x + (b.x - a.x) * u + (c.x - a.x) * v;
    out[i * 3 + 1] = a.y + (b.y - a.y) * u + (c.y - a.y) * v;
    out[i * 3 + 2] = a.z + (b.z - a.z) * u + (c.z - a.z) * v;
  }
  return out;
}
