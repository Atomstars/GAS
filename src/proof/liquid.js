import * as THREE from 'three';
import * as opentype from 'opentype.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ==================================================================
   PROOF — GAS as a physical object.

   No particles. The letterforms are the real Syncopate outlines,
   extruded and bevelled into actual geometry, so the edges are
   mathematically sharp at any zoom instead of being made of dots.

   Rough on purpose: one object, three materials, a slow camera.
   No layout, no type, no scroll. This exists only to answer whether
   the *material* direction is right before anything is built on it.
================================================================== */

const WORD = 'GAS';
const WIDTH = 30;          // world units across
const DEPTH = 3.4;         // extrusion depth

/* ---------------- outline → geometry ---------------- */

function commandsToContours(path, s) {
  const contours = [];
  let cur = null;
  for (const c of path.commands) {
    switch (c.type) {
      case 'M':
        cur = new THREE.Path();
        cur.moveTo(c.x * s, -c.y * s);       // opentype is y-down, three is y-up
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

/* Counters — the hole in an A, the bowl of a G — are separate closed
   contours in the font. Even-odd containment tells us which is which. */
function contoursToShapes(contours) {
  const sampled = contours.map(c => c.getPoints(64));
  const shapes = [];
  const isHole = contours.map((_, i) => {
    let depth = 0;
    for (let j = 0; j < contours.length; j++) {
      if (i === j) continue;
      if (pointInPolygon(sampled[i][0], sampled[j])) depth++;
    }
    return depth % 2 === 1;
  });

  contours.forEach((c, i) => {
    if (isHole[i]) return;
    const shape = new THREE.Shape(c.getPoints(64));
    contours.forEach((h, j) => {
      if (i === j || !isHole[j]) return;
      if (pointInPolygon(sampled[j][0], sampled[i])) shape.holes.push(new THREE.Path(sampled[j]));
    });
    shapes.push(shape);
  });
  return shapes;
}

async function loadFontBuffer() {
  /* When this page is shipped as a single self-contained file the font
     travels with it as base64, so there is nothing to fetch. */
  const b64 = window.__GAS_FONT_B64;
  if (b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
  return fetch('/fonts/Syncopate-Bold.ttf').then(r => r.arrayBuffer());
}

async function buildWordGeometry() {
  const font = opentype.parse(await loadFontBuffer());

  const SIZE = 100;
  const path = font.getPath(WORD, 0, 0, SIZE);
  const bb = path.getBoundingBox();
  const scale = WIDTH / (bb.x2 - bb.x1);

  const shapes = contoursToShapes(commandsToContours(path, scale));

  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: DEPTH,
    curveSegments: 22,
    bevelEnabled: true,
    bevelThickness: 0.42,
    bevelSize: 0.34,
    bevelOffset: 0,
    bevelSegments: 6,
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

/* ---------------- the room the metal reflects ----------------
   Chrome is nothing but its environment. A neutral studio HDRI makes
   it look like a product render; long bright strips in a dark room
   are what give it those sweeping highlights.                      */
function buildEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x04050b);

  const bar = (w, h, pos, rot, color, power) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power) })
    );
    m.position.set(...pos);
    m.rotation.set(...rot);
    env.add(m);
  };

  const H = Math.PI / 2;
  bar(60, 9,  [0, 26, -6],  [H, 0, 0],       0xffffff, 4.2);  // key, overhead
  bar(46, 5,  [0, -22, 4],  [-H, 0, 0],      0xbfd4ff, 1.3);  // soft floor bounce
  bar(7, 52,  [-30, 2, 6],  [0, H, 0],       0x59e2ff, 3.4);  // cyan rim, left
  bar(7, 52,  [30, 0, 6],   [0, -H, 0],      0xff5fd2, 2.8);  // magenta rim, right
  bar(30, 16, [0, 6, -40],  [0, 0, 0],       0xffffff, 1.5);  // back fill
  bar(14, 40, [-14, 8, 34], [0, Math.PI, 0], 0xffffff, 2.0);  // front streak

  const tex = pmrem.fromScene(env, 0.03).texture;
  pmrem.dispose();
  return tex;
}

/* ---------------- surface flow ----------------
   Solid chrome reads as dead. What makes metal look *liquid* is the
   reflection swimming, which comes from the normal moving — not from
   the silhouette moving. So we perturb the normal hard and displace
   the surface only slightly.                                       */
const SIMPLEX = /* glsl */ `
vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
vec4 mod289(vec4 x){ return x - floor(x*(1.0/289.0))*289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314*r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m*m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
float flow(vec3 p, float t){
  return snoise(p * 0.085 + vec3(0.0, 0.0, t * 0.18))
       + snoise(p * 0.210 + vec3(3.1, 1.7, t * 0.31)) * 0.45;
}
`;

function makeLiquid(material, uTime, opts = {}) {
  const ripple = opts.ripple ?? 1.0;
  const swell = opts.swell ?? 0.22;
  material.onBeforeCompile = shader => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = `uniform float uTime;\n${SIMPLEX}\n${shader.vertexShader}`
      .replace('#include <beginnormal_vertex>', /* glsl */ `
        vec3 objectNormal = vec3(normal);
        {
          float e = 0.55;
          float dx = flow(position + vec3(e,0.0,0.0), uTime) - flow(position - vec3(e,0.0,0.0), uTime);
          float dy = flow(position + vec3(0.0,e,0.0), uTime) - flow(position - vec3(0.0,e,0.0), uTime);
          float dz = flow(position + vec3(0.0,0.0,e), uTime) - flow(position - vec3(0.0,0.0,e), uTime);
          objectNormal = normalize(objectNormal - vec3(dx, dy, dz) * ${ripple.toFixed(2)});
        }
      `)
      .replace('#include <begin_vertex>', /* glsl */ `
        vec3 transformed = position + normal * flow(position, uTime) * ${swell.toFixed(3)};
      `);
  };
  material.customProgramCacheKey = () => `liquid-${ripple}-${swell}`;
  return material;
}

/* ================================================================ */

const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03040a);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 400);

const envMap = buildEnvironment(renderer);
scene.environment = envMap;

const uTime = { value: 0 };

const MATERIALS = [
  {
    label: 'LIQUID CHROME',
    make: () => makeLiquid(new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 1.0, roughness: 0.055,
      envMap, envMapIntensity: 1.15, clearcoat: 1.0, clearcoatRoughness: 0.08,
    }), uTime, { ripple: 0.52, swell: 0.095 }),
  },
  {
    label: 'BLACK GLASS',
    make: () => makeLiquid(new THREE.MeshPhysicalMaterial({
      color: 0x0a0d18, metalness: 0.0, roughness: 0.035,
      transmission: 0.92, thickness: 3.2, ior: 1.62,
      envMap, envMapIntensity: 2.1, clearcoat: 1.0, clearcoatRoughness: 0.04,
      specularIntensity: 1.0,
    }), uTime, { ripple: 0.40, swell: 0.075 }),
  },
  {
    label: 'MOLTEN MERCURY',
    make: () => makeLiquid(new THREE.MeshPhysicalMaterial({
      color: 0xdfe9ff, metalness: 1.0, roughness: 0.16,
      envMap, envMapIntensity: 1.25,
      iridescence: 1.0, iridescenceIOR: 1.9, iridescenceThicknessRange: [120, 620],
    }), uTime, { ripple: 0.88, swell: 0.24 }),
  },
];

let mesh = null, matIndex = 0;
const labelEl = document.getElementById('label');

function applyMaterial(i) {
  matIndex = ((i % MATERIALS.length) + MATERIALS.length) % MATERIALS.length;
  const m = MATERIALS[matIndex];
  if (mesh) {
    mesh.material.dispose();
    mesh.material = m.make();
  }
  labelEl.textContent = m.label;
  labelEl.classList.remove('flash');
  void labelEl.offsetWidth;
  labelEl.classList.add('flash');
}

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.30, 0.40, 1.25);
composer.addPass(bloom);
const outPass = new OutputPass();
outPass.toneMapping = THREE.ACESFilmicToneMapping;
composer.addPass(outPass);

const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', e => {
  pointer.tx = (e.clientX / innerWidth) * 2 - 1;
  pointer.ty = -((e.clientY / innerHeight) * 2 - 1);
}, { passive: true });

/* tap or press any key to compare materials — proof only */
addEventListener('pointerdown', () => applyMaterial(matIndex + 1));
addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === ' ') applyMaterial(matIndex + 1);
  if (e.key === 'ArrowLeft') applyMaterial(matIndex - 1);
});

const clock = new THREE.Clock();

function fitDistance() {
  /* keep the word framed on any screen shape, width *and* height */
  const half = THREE.MathUtils.degToRad(camera.fov * 0.5);
  const byW = (WIDTH * 0.62) / (Math.tan(half) * camera.aspect);
  const byH = 7.4 / Math.tan(half);
  return Math.max(byW, byH);
}

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  uTime.value = t;

  pointer.x += (pointer.tx - pointer.x) * (1 - Math.exp(-dt * 3));
  pointer.y += (pointer.ty - pointer.y) * (1 - Math.exp(-dt * 3));

  /* Slow orbit. Metal only comes alive when the highlights travel
     across it, so the camera is never allowed to stop — but the radius
     has to stay constant, or swinging the camera quietly dollies it in
     and crops the word. */
  const d = fitDistance();
  const a = Math.sin(t * 0.13) * 0.40 + pointer.x * 0.30;
  const y = 1.8 + Math.sin(t * 0.21) * 1.0 + pointer.y * 2.0;
  const r = Math.sqrt(Math.max(1, d * d - y * y));
  camera.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
  camera.lookAt(0, 0, 0);

  if (mesh) mesh.rotation.y = Math.sin(t * 0.13) * 0.16 + pointer.x * 0.10;

  composer.render();
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  bloom.setSize(innerWidth, innerHeight);
});

buildWordGeometry().then(geo => {
  mesh = new THREE.Mesh(geo, MATERIALS[0].make());
  scene.add(mesh);
  labelEl.textContent = MATERIALS[0].label;
  document.getElementById('boot').classList.add('gone');
  window.PROOF = { scene, camera, renderer, mesh, applyMaterial, MATERIALS, ready: true };
  tick();
}).catch(err => {
  console.error(err);
  document.getElementById('boot').textContent = 'failed: ' + err.message;
});
