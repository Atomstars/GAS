import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

/* ==================================================================
   GAS · from a single molecule to the stars
   Scroll-piloted continuous flight:
   molecules → atmosphere gas → Earth flyby → the Sun → the galaxy,
   where six STARS are the projects (small planets orbit them).
   Everything is a pure function of journey progress P ∈ [0,1].
================================================================== */

const PROJECTS = [
  { name: 'DAVINA AEROSPACE', repo: 'Davina_AeroSpace', color: 0x6ec8ff, ptex: '2k_earth_daymap.jpg',
    desc: 'A TypeScript-built aerospace platform — fitting, for someone named after the sky.', tags: ['TypeScript', 'Product'] },
  { name: 'JOB-AGENT', repo: 'Job-Agent', color: 0xffb066, ptex: '2k_mars.jpg',
    desc: 'An autonomous AI agent that hunts opportunities while you sleep. AI that works for you — literally.', tags: ['AI Agent', 'JavaScript'] },
  { name: 'CAFÉ POS × N8N', repo: 'Cafe_pos', color: 0xffd9a0, ptex: '2k_saturn.jpg', ring: true,
    desc: 'A point-of-sale system hard-wired into n8n automation flows. Orders in, workflows out.', tags: ['TypeScript', 'Automation'] },
  { name: 'HOUSING PREDICTOR', repo: 'Housing_Predictor_ML', color: 0xa0ffc8, ptex: '2k_venus_atmosphere.jpg',
    desc: 'Machine learning that reads the housing market and calls the price before the market does.', tags: ['ML', 'Python'] },
  { name: 'BUDDY APP', repo: 'Buddy-App', color: 0xc89aff, ptex: '2k_neptune.jpg',
    desc: 'A companion app built to be actually used — clean JavaScript, human-first design.', tags: ['JavaScript', 'App'] },
  { name: 'GMAT VERBAL ENGINE', repo: 'gmat-verbal-practice', color: 0x7ae8ff, ptex: '2k_jupiter.jpg',
    desc: 'A custom practice platform + parser for GMAT CR/RC — because off-the-shelf wasn’t good enough.', tags: ['EdTech', 'Parser'] },
];
const og = r => `https://opengraph.githubassets.com/1/Atomstars/${r}`;

/* ============================ RENDERER ============================ */
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('bg'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a1533, 0.05);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2000);

const texLoader = new THREE.TextureLoader();
function colorTex(path) {
  const t = texLoader.load(path);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

/* ---------------- canvas sprite factories (soft gas looks) -------- */
function radialSprite(size, stops) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}
/* a "molecule": 2–3 fused glowing circles */
function moleculeSprite(tint) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const lobes = [[64, 70, 30], [46, 52, 20], [84, 50, 17]];
  for (const [lx, ly, r] of lobes) {
    const g = x.createRadialGradient(lx, ly, 0, lx, ly, r);
    g.addColorStop(0, `rgba(255,255,255,.95)`);
    g.addColorStop(.35, tint);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(lx, ly, r, 0, 7); x.fill();
  }
  return new THREE.CanvasTexture(c);
}
/* star flare: core + 4-point diffraction spikes + halo */
function flareSprite(hex) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  const col = new THREE.Color(hex);
  const rgb = `${col.r*255|0},${col.g*255|0},${col.b*255|0}`;
  let g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(.08, `rgba(${rgb},.9)`);
  g.addColorStop(.3, `rgba(${rgb},.18)`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  x.globalCompositeOperation = 'lighter';
  for (const rot of [0, Math.PI / 2]) {
    x.save(); x.translate(128, 128); x.rotate(rot);
    const lg = x.createLinearGradient(-128, 0, 128, 0);
    lg.addColorStop(0, 'rgba(0,0,0,0)');
    lg.addColorStop(.5, `rgba(255,255,255,.85)`);
    lg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = lg;
    x.fillRect(-128, -2.2, 256, 4.4);
    x.restore();
  }
  return new THREE.CanvasTexture(c);
}

/* ======================= MILKY WAY SKYBOX ========================= */
const skyMat = new THREE.MeshBasicMaterial({
  map: colorTex('textures/2k_stars_milky_way.jpg'), side: THREE.BackSide, fog: false,
  transparent: true, opacity: 0,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 48), skyMat);
sky.rotation.z = 0.35;
scene.add(sky);

/* ============================ LIGHTS ============================== */
scene.add(new THREE.AmbientLight(0x35507a, 1.6));
const camLight = new THREE.PointLight(0x9fc0ff, 60, 0, 2);
scene.add(camLight);

/* =================================================================
   STAGE 1 — GAS MOLECULES (camera starts inside the gas)
================================================================= */
const molTex = [moleculeSprite('rgba(90,200,255,.8)'), moleculeSprite('rgba(150,120,255,.8)'), moleculeSprite('rgba(255,120,210,.75)')];
const molMats = molTex.map(t => new THREE.SpriteMaterial({ map: t, transparent: true, opacity: .85, depthWrite: false, blending: THREE.AdditiveBlending }));
const molecules = new THREE.Group();
const molData = [];
for (let i = 0; i < 150; i++) {
  const s = new THREE.Sprite(molMats[i % 3]);
  const scale = .35 + Math.random() * 1.5;
  s.scale.setScalar(scale);
  s.position.set((Math.random() - .5) * 46, (Math.random() - .5) * 30, 20 - Math.random() * 70);
  molecules.add(s);
  molData.push({ s, seed: Math.random() * 7, sp: .2 + Math.random() * .5 });
}
scene.add(molecules);

/* =================================================================
   STAGE 2 — ATMOSPHERE GAS LAYERS (big soft clouds you fly through)
================================================================= */
const cloudTex = radialSprite(256, [[0, 'rgba(190,220,255,.55)'], [.45, 'rgba(120,160,230,.22)'], [1, 'rgba(0,0,0,0)']]);
const cloudMat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: .5, depthWrite: false });
const clouds = new THREE.Group();
const cloudData = [];
for (let i = 0; i < 34; i++) {
  const s = new THREE.Sprite(cloudMat);
  s.scale.set(14 + Math.random() * 26, 7 + Math.random() * 12, 1);
  s.position.set((Math.random() - .5) * 60, (Math.random() - .5) * 26, -22 - Math.random() * 42);
  clouds.add(s);
  cloudData.push({ s, seed: Math.random() * 7 });
}
scene.add(clouds);

/* =================================================================
   NEBULA WISPS — gas that streams past you for the WHOLE flight
================================================================= */
const wispTexs = [
  radialSprite(256, [[0, 'rgba(0,229,255,.16)'], [.5, 'rgba(80,60,255,.07)'], [1, 'rgba(0,0,0,0)']]),
  radialSprite(256, [[0, 'rgba(255,77,216,.13)'], [.5, 'rgba(120,60,255,.06)'], [1, 'rgba(0,0,0,0)']]),
];
const wispMats = wispTexs.map(t => new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
const wisps = new THREE.Group();
for (let i = 0; i < 60; i++) {
  const s = new THREE.Sprite(wispMats[i % 2]);
  s.scale.setScalar(10 + Math.random() * 26);
  s.position.set(
    (Math.random() - .5) * 70,
    (Math.random() - .5) * 44,
    30 - Math.random() * 400
  );
  wisps.add(s);
}
scene.add(wisps);

/* =================================================================
   STAGE 3 — EARTH (flyby on the right)
================================================================= */
function makeAtmosphere(radius, hex, power = 2.6, alpha = .85) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
    uniforms: { uColor: { value: new THREE.Color(hex) } },
    vertexShader: `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; varying vec3 vN; varying vec3 vV;
      void main() {
        float rim = pow(1.0 - abs(dot(vN, vV)), ${power.toFixed(1)});
        gl_FragColor = vec4(uColor, rim * ${alpha.toFixed(2)});
      }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(radius * 1.15, 48, 48), mat);
}

const earth = new THREE.Group();
const earthMesh = new THREE.Mesh(
  new THREE.SphereGeometry(8, 64, 64),
  new THREE.MeshStandardMaterial({ map: colorTex('textures/2k_earth_daymap.jpg'), roughness: .95, metalness: 0 })
);
earth.add(earthMesh);
earth.add(makeAtmosphere(8, 0x4d9fff, 3.2, .9));
earth.position.set(10, -3, -82);
earth.rotation.z = .2;
scene.add(earth);
const earthLight = new THREE.DirectionalLight(0xfff2dd, 2.6);
earthLight.position.set(-30, 10, -60);
earthLight.target = earthMesh;
scene.add(earthLight);

/* =================================================================
   STAGE 4 — THE SUN + inner planets
================================================================= */
const solar = new THREE.Group();
solar.position.set(0, 2, -150);
scene.add(solar);
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(4.6, 64, 64),
  new THREE.MeshBasicMaterial({ map: colorTex('textures/2k_sun.jpg') })
);
solar.add(sun);
const corona = new THREE.Sprite(new THREE.SpriteMaterial({
  map: radialSprite(256, [[0, 'rgba(255,240,200,1)'], [.25, 'rgba(255,150,50,.45)'], [1, 'rgba(0,0,0,0)']]),
  blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
}));
corona.scale.setScalar(30);
solar.add(corona);
const sunFlare = new THREE.Sprite(new THREE.SpriteMaterial({
  map: flareSprite(0xffdca0), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .8,
}));
sunFlare.scale.setScalar(46);
solar.add(sunFlare);
const sunLight = new THREE.PointLight(0xfff4e0, 6000, 0, 2);
solar.add(sunLight);
/* small planets around the sun */
[['2k_mars.jpg', 9, .9, .6], ['2k_venus_atmosphere.jpg', 13, 1.15, 2.6], ['2k_neptune.jpg', 18, 1.35, 4.4]].forEach(([tx, d, sz, a]) => {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(sz, 40, 40),
    new THREE.MeshStandardMaterial({ map: colorTex(`textures/${tx}`), roughness: .9 })
  );
  m.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
  solar.add(m);
  const seg = 120, op = new Float32Array(seg * 3);
  for (let s = 0; s < seg; s++) {
    const ang = s / (seg - 1) * Math.PI * 2;
    op[s*3] = Math.cos(ang) * d; op[s*3+2] = Math.sin(ang) * d;
  }
  const olg = new THREE.BufferGeometry();
  olg.setAttribute('position', new THREE.BufferAttribute(op, 3));
  solar.add(new THREE.Line(olg, new THREE.LineBasicMaterial({ color: 0x2a4258, transparent: true, opacity: .3 })));
});

/* =================================================================
   STAGE 5 — THE GALAXY + six PROJECT STARS
================================================================= */
function makeGalaxy() {
  const N = 16000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const inside = new THREE.Color(0xffc8e8), outside = new THREE.Color(0x3aa8ff);
  for (let i = 0; i < N; i++) {
    const r = Math.pow(Math.random(), 1.5) * 90;
    const arm = (i % 4) / 4 * Math.PI * 2;
    const a = arm + r * 0.09;
    const spread = Math.exp(-r * 0.02) * 22;
    pos[i*3]   = Math.cos(a) * r + (Math.random() - .5) * spread;
    pos[i*3+1] = (Math.random() - .5) * Math.exp(-r * .025) * 14;
    pos[i*3+2] = Math.sin(a) * r + (Math.random() - .5) * spread;
    const c = inside.clone().lerp(outside, Math.min(1, r / 90));
    col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({
    size: .5, vertexColors: true, transparent: true, opacity: .85,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  }));
}
const galaxy = makeGalaxy();
galaxy.position.set(0, -14, -300);
galaxy.rotation.x = 0.42;
scene.add(galaxy);

/* project stars inside the galaxy region */
const stars = [];
PROJECTS.forEach((P, i) => {
  const grp = new THREE.Group();
  const flare = new THREE.Sprite(new THREE.SpriteMaterial({
    map: flareSprite(P.color), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }));
  flare.scale.setScalar(6);
  grp.add(flare);
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(.5, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  grp.add(core);
  grp.add(new THREE.PointLight(P.color, 120, 0, 2));

  /* a small planet (with ring for the POS star) orbiting the star */
  const pl = new THREE.Mesh(
    new THREE.SphereGeometry(.42, 32, 32),
    new THREE.MeshStandardMaterial({ map: colorTex(`textures/${P.ptex}`), roughness: .9 })
  );
  grp.add(pl);
  if (P.ring) {
    const rg = new THREE.RingGeometry(.6, 1.0, 64, 1);
    const p3 = new THREE.Vector3(), uv = rg.attributes.uv, rp = rg.attributes.position;
    for (let k = 0; k < rp.count; k++) {
      p3.fromBufferAttribute(rp, k);
      uv.setXY(k, (p3.length() - .6) / .4, .5);
    }
    const ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({
      map: colorTex('textures/2k_saturn_ring_alpha.png'), side: THREE.DoubleSide, transparent: true, depthWrite: false,
    }));
    ring.rotation.x = Math.PI / 2.5;
    pl.add(ring);
  }

  grp.position.set(
    (i % 2 ? 11 : -11) + (Math.random() - .5) * 3,
    (i % 3 - 1) * 5,
    -205 - i * 17
  );
  grp.userData = { flare, pl, angle: Math.random() * 7 };
  stars.push(grp);
  scene.add(grp);
});

/* =================================================================
   JOURNEY — camera keyframes (pure function of P)
================================================================= */
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const smooth = t => t * t * (3 - 2 * t);
const clamp01 = v => THREE.MathUtils.clamp(v, 0, 1);

const FIRST = 0.70, STEP = 0.040, DWELL = 0.022;
const keyframes = [
  { p: 0.00, pos: V(0, 0, 18),  look: V(0, 0, -60) },
  { p: 0.13, pos: V(0, 0, -4),  look: V(0, 0, -70) },
  { p: 0.22, pos: V(0, 1, -30), look: V(0, 2, -90) },
  { p: 0.30, pos: V(0, 2, -54), look: V(4, 0, -100) },
  { p: 0.37, pos: V(1, -1, -66), look: V(10, -3, -82) },   /* Earth approach */
  { p: 0.45, pos: V(4, 0, -95), look: V(10, -3, -82) },    /* looking back at Earth */
  { p: 0.52, pos: V(2, 3, -112), look: V(0, 2, -150) },    /* Sun ahead */
  { p: 0.62, pos: V(-3, 6, -126), look: V(0, 2, -150) },
  { p: 0.68, pos: V(0, 8, -158), look: V(0, -6, -300) },   /* galaxy reveal */
];
PROJECTS.forEach((P, i) => {
  const sp = stars[i].position;
  const pA = FIRST + i * STEP;
  keyframes.push({ p: pA,          pos: sp.clone().add(V(2.1, 1.0, 7.5)), look: sp.clone().add(V(-.8, 0, 0)) });
  keyframes.push({ p: pA + DWELL,  pos: sp.clone().add(V(3.0, 1.2, 6.0)), look: sp.clone().add(V(-.8, 0, 0)) });
});
keyframes.push({ p: 0.955, pos: V(0, 34, -180), look: V(0, -16, -300) });
keyframes.push({ p: 1.00,  pos: V(0, 46, -150), look: V(0, -20, -300) });

function cameraAt(P, outPos, outLook) {
  let a = keyframes[0], b = keyframes[keyframes.length - 1];
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (P >= keyframes[i].p && P <= keyframes[i + 1].p) { a = keyframes[i]; b = keyframes[i + 1]; break; }
  }
  const t = b.p === a.p ? 0 : smooth((P - a.p) / (b.p - a.p));
  outPos.lerpVectors(a.pos, b.pos, t);
  outLook.lerpVectors(a.look, b.look, t);
}

/* =================================================================
   INPUT — wheel / touch / keys. No buttons anywhere.
================================================================= */
let P = 0, targetP = 0;
addEventListener('wheel', e => { targetP = clamp01(targetP + e.deltaY * 0.00013); }, { passive: true });
let touchY = null;
addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
addEventListener('touchmove', e => {
  if (touchY === null) return;
  const dy = touchY - e.touches[0].clientY;
  touchY = e.touches[0].clientY;
  targetP = clamp01(targetP + dy * 0.0009);
}, { passive: true });
addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') targetP = clamp01(targetP + 0.025);
  if (e.key === 'ArrowUp' || e.key === 'PageUp') targetP = clamp01(targetP - 0.025);
});

/* =================================================================
   GAS TITLE — soft molecule blobs swirl in clusters, condense to GAS
================================================================= */
const gc = document.getElementById('gas-canvas');
const gctx = gc.getContext('2d');
let particles = [], gasPhase = 0, condense = 0;
let blobSprites = [];
function makeBlob(rgb) {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, `rgba(255,255,255,.9)`);
  g.addColorStop(.3, `rgba(${rgb},.55)`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  return c;
}
blobSprites = [makeBlob('90,220,255'), makeBlob('150,120,255'), makeBlob('255,120,215')];

function buildParticles() {
  const w = gc.clientWidth, h = gc.clientHeight;
  if (!w || !h) return;
  gc.width = w; gc.height = h;
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  const o = off.getContext('2d');
  const fs = Math.min(w / 3.2, h * .9);
  o.font = `700 ${fs}px Syncopate, sans-serif`;
  o.textAlign = 'center'; o.textBaseline = 'middle';
  o.fillStyle = '#fff';
  o.fillText('GAS', w / 2, h / 2 + fs * .06);
  const img = o.getImageData(0, 0, w, h).data;
  /* swirling gas clusters as the birth-place of every particle */
  const nClusters = 7;
  const clusters = Array.from({ length: nClusters }, () => ({
    x: Math.random() * w, y: Math.random() * h,
    r: 30 + Math.random() * 70,
  }));
  particles = [];
  const gap = Math.max(4, Math.round(w / 240));
  for (let y = 0; y < h; y += gap)
    for (let x = 0; x < w; x += gap)
      if (img[(y * w + x) * 4 + 3] > 128) {
        const cl = clusters[Math.random() * nClusters | 0];
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.sqrt(Math.random()) * cl.r;
        particles.push({
          x: cl.x + Math.cos(ang) * rad, y: cl.y + Math.sin(ang) * rad,
          cx: cl.x, cy: cl.y, orbitR: rad, orbitA: ang, orbitS: (.3 + Math.random() * .7) * (Math.random() < .5 ? -1 : 1),
          tx: x, ty: y, seed: Math.random() * 7,
          spr: blobSprites[Math.random() * 3 | 0],
          sz: 3 + Math.random() * 7,
        });
      }
}
let gmx = -9999, gmy = -9999;
gc.addEventListener('pointermove', e => {
  const r = gc.getBoundingClientRect();
  gmx = e.clientX - r.left; gmy = e.clientY - r.top;
});
gc.addEventListener('pointerleave', () => { gmx = gmy = -9999; });

function drawGas(tms) {
  requestAnimationFrame(drawGas);
  if (P > 0.16 || !particles.length) return;
  const w = gc.width, h = gc.height;
  const t = tms * .001;
  gctx.clearRect(0, 0, w, h);
  gctx.globalCompositeOperation = 'lighter';
  const disperse = smooth(clamp01(P / 0.12));
  for (const p of particles) {
    if (gasPhase === 0 || condense < 1) {
      /* swirl around the cluster centre — true gas motion */
      p.orbitA += p.orbitS * .016;
    }
    const swirlX = p.cx + Math.cos(p.orbitA) * p.orbitR + Math.sin(t * .7 + p.seed) * 6;
    const swirlY = p.cy + Math.sin(p.orbitA) * p.orbitR * .6 + Math.cos(t * .5 + p.seed) * 5;
    const sway = Math.sin(t * 2 + p.seed) * 1.4;
    /* blend: swirling gas → letter target → dispersed gas (on scroll) */
    const k = smooth(condense) * (1 - disperse);
    let x = swirlX + (p.tx + sway - swirlX) * k;
    let y = swirlY + (p.ty - swirlY) * k;
    if (disperse > 0) {
      x += Math.cos(p.seed * 4) * disperse * 160;
      y += (Math.sin(p.seed * 4) - .3) * disperse * 120;
    }
    const rx = x - gmx, ry = y - gmy, d2 = rx * rx + ry * ry;
    if (d2 < 6400) {
      const f = (1 - d2 / 6400) * 14, d = Math.sqrt(d2) || 1;
      x += rx / d * f; y += ry / d * f;
    }
    const sz = p.sz * (1 - disperse * .5);
    gctx.globalAlpha = (1 - disperse) * .85;
    gctx.drawImage(p.spr, x - sz / 2, y - sz / 2, sz, sz);
  }
  gctx.globalAlpha = 1;
  gctx.globalCompositeOperation = 'source-over';
}
buildParticles();
addEventListener('resize', buildParticles);
requestAnimationFrame(drawGas);

gsap.timeline({ delay: 1.2 })
  .add(() => { gasPhase = 1; })
  .to({ v: 0 }, { v: 1, duration: 3.2, ease: 'power2.inOut', onUpdate() { condense = this.targets()[0].v; } })
  .to('#intro-tag',  { opacity: 1, duration: 1 }, '-=1.4')
  .to('#intro-line', { opacity: 1, duration: 1 }, '-=0.7')
  .to('#scroll-hint', { opacity: 1, duration: 1 }, '-=0.5');

/* =================================================================
   DOM STATE — title card, panel, contact (all P-driven)
================================================================= */
const $ = id => document.getElementById(id);
const panelEl = $('panel'), tcEl = $('titlecard'), contactEl = $('contact'), introEl = $('intro');

let shownStar = -1;
function activeStar(P) {
  for (let i = 0; i < PROJECTS.length; i++) {
    const pA = FIRST + i * STEP;
    if (P >= pA - 0.013 && P <= pA + DWELL + 0.013) return i;
  }
  return -1;
}
function setStarUI(i) {
  if (i === shownStar) return;
  shownStar = i;
  if (i === -1) {
    gsap.to(panelEl, { opacity: 0, x: 40, duration: .45, onComplete: () => panelEl.classList.remove('on') });
    gsap.to(tcEl, { opacity: 0, x: -30, duration: .45 });
    return;
  }
  const P = PROJECTS[i];
  $('tc-num').textContent = `STAR 0${i + 1} / 06`;
  $('tc-name').textContent = P.name;
  $('p-img').src = og(P.repo);
  $('p-desc').textContent = P.desc;
  $('p-tags').innerHTML = P.tags.map(t => `<i>${t}</i>`).join('');
  $('p-link').href = `https://github.com/Atomstars/${P.repo}`;
  panelEl.classList.add('on');
  gsap.fromTo(tcEl, { opacity: 0, x: -50 }, { opacity: 1, x: 0, duration: .8, ease: 'power3.out' });
  gsap.fromTo(panelEl, { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: .8, ease: 'power3.out', delay: .12 });
}

/* =================================================================
   MAIN LOOP
================================================================= */
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', e => {
  mouse.tx = e.clientX / innerWidth * 2 - 1;
  mouse.ty = -(e.clientY / innerHeight) * 2 + 1;
});
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
const fogColFrom = new THREE.Color(0x0a1533), fogColTo = new THREE.Color(0x010104), fogCol = new THREE.Color();
const clock = new THREE.Clock();

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), .05);
  const t = clock.elapsedTime;
  P += (targetP - P) * (1 - Math.exp(-dt * 3.0));
  mouse.x += (mouse.tx - mouse.x) * .05;
  mouse.y += (mouse.ty - mouse.y) * .05;

  cameraAt(P, camPos, camLook);
  camera.position.copy(camPos);

  /* atmosphere → space transition: fog thins, sky reveals */
  const space = smooth(clamp01((P - 0.16) / 0.22));
  scene.fog.density = THREE.MathUtils.lerp(0.045, 0.0006, space);
  fogCol.lerpColors(fogColFrom, fogColTo, space);
  scene.fog.color.copy(fogCol);
  renderer.setClearColor(fogCol);
  skyMat.opacity = space;

  /* stage animation */
  const molVis = P < 0.30;
  molecules.visible = molVis;
  if (molVis) {
    const fade = 1 - smooth(clamp01((P - 0.16) / 0.12));
    molMats.forEach(m => m.opacity = .85 * fade);
    for (const d of molData) {
      d.s.position.x += Math.sin(t * d.sp + d.seed) * .01;
      d.s.position.y += Math.cos(t * d.sp * .8 + d.seed) * .008;
    }
  }
  const cloudVis = P > 0.06 && P < 0.44;
  clouds.visible = cloudVis;
  if (cloudVis) {
    const wIn = smooth(clamp01((P - 0.06) / 0.08)), wOut = 1 - smooth(clamp01((P - 0.33) / 0.11));
    cloudMat.opacity = .5 * wIn * wOut;
    for (const d of cloudData) d.s.position.x += Math.sin(t * .1 + d.seed) * .02;
  }
  earthMesh.rotation.y += dt * .05;
  sun.rotation.y += dt * .02;
  corona.scale.setScalar(30 + Math.sin(t * 1.7) * 1.2);
  sunFlare.material.rotation = Math.sin(t * .12) * .2;
  galaxy.rotation.y += dt * .004;
  for (const s of stars) {
    s.userData.angle += dt * .5;
    s.userData.pl.position.set(Math.cos(s.userData.angle) * 1.9, 0, Math.sin(s.userData.angle) * 1.9);
    s.userData.pl.rotation.y += dt * .4;
    s.userData.flare.scale.setScalar(6 + Math.sin(t * 2.3 + s.position.z) * .5);
  }

  camLook.x += mouse.x * 1.3;
  camLook.y += mouse.y * .85;
  camera.lookAt(camLook);
  camLight.position.copy(camera.position);

  /* DOM */
  introEl.style.opacity = String(1 - smooth(clamp01((P - 0.01) / 0.1)));
  introEl.style.visibility = P > 0.15 ? 'hidden' : 'visible';
  setStarUI(activeStar(P));
  const cOp = smooth(clamp01((P - 0.95) / 0.045));
  contactEl.style.opacity = String(cOp);
  contactEl.classList.toggle('on', cOp > 0.5);
  $('rail-fill').style.height = (P * 100).toFixed(2) + '%';

  renderer.render(scene, camera);
}
function size() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', size);
size();
tick();

/* =================================================================
   FILM GRAIN (static, flicker via CSS)
================================================================= */
const grain = document.getElementById('grain');
const gx = grain.getContext('2d');
function sizeGrain() {
  grain.width = innerWidth / 3; grain.height = innerHeight / 3;
  const d = gx.createImageData(grain.width, grain.height);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = Math.random() * 255 | 0;
    d.data[i] = d.data[i+1] = d.data[i+2] = v; d.data[i+3] = 40;
  }
  gx.putImageData(d, 0, 0);
}
sizeGrain(); addEventListener('resize', sizeGrain);

/* =================================================================
   CURSOR + RIPPLE
================================================================= */
const cur = document.getElementById('cursor'), dot = document.getElementById('cursor-dot');
let cx = 0, cy = 0, px2 = 0, py2 = 0;
addEventListener('pointermove', e => { px2 = e.clientX; py2 = e.clientY; });
(function mc() {
  cx += (px2 - cx) * .16; cy += (py2 - cy) * .16;
  cur.style.left = cx + 'px'; cur.style.top = cy + 'px';
  dot.style.left = px2 + 'px'; dot.style.top = py2 + 'px';
  requestAnimationFrame(mc);
})();
document.addEventListener('pointerover', e => {
  if (e.target.closest('a')) cur.classList.add('hot'); else cur.classList.remove('hot');
});
addEventListener('pointerdown', e => {
  const r = document.createElement('div');
  r.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;border-radius:50%;pointer-events:none;z-index:999;border:1px solid #00e5ff;transform:translate(-50%,-50%);mix-blend-mode:screen;`;
  r.animate([{ width: '0px', height: '0px', opacity: .9 }, { width: '200px', height: '200px', opacity: 0 }], { duration: 650, easing: 'ease-out' });
  document.body.appendChild(r);
  setTimeout(() => r.remove(), 650);
});
