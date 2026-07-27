import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ==================================================================
   THE GAS MARK

   Not a typeface with depth on it. A drawn mark, and an idea:

   matter has states. The same three particles sit in a vessel and
   behave completely differently depending on how much energy is in
   the system — locked in a lattice when cold, loose and flowing when
   warm, free and colliding when hot.

   Touch is the energy. Move over it, drag across it, and you are
   heating it: the lattice breaks, the particles come loose, the ring
   flares. Leave it alone and it cools back down and re-forms. The
   interaction is not decoration on the logo, it *is* the logo.
================================================================== */

const RING_R = 3.15;
const P_R = 0.40;

/* ---------------- scene ---------------- */
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04050b);
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 200);

/* ---------------- the room ---------------- */
function buildEnv() {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x03040a);
  const bar = (w, h, pos, rot, color, power) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power) }));
    m.position.set(...pos); m.rotation.set(...rot); env.add(m);
  };
  const H = Math.PI / 2;
  bar(44, 3, [0, 22, -4], [H, 0, 0], 0xffffff, 3.6);
  bar(3, 40, [-24, 2, 6], [0, H, 0], 0x4fd6ff, 3.0);
  bar(3, 40, [24, 0, 6], [0, -H, 0], 0xff5fd2, 2.4);
  bar(20, 8, [0, 4, -32], [0, 0, 0], 0xffffff, 1.2);
  const tex = pmrem.fromScene(env, 0.03).texture;
  pmrem.dispose();
  return tex;
}
const envMap = buildEnv();
scene.environment = envMap;

const key = new THREE.DirectionalLight(0xdce8ff, 2.4);
key.position.set(-9, 16, 11);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -10; key.shadow.camera.right = 10;
key.shadow.camera.top = 10; key.shadow.camera.bottom = -10;
key.shadow.bias = -0.0012;
scene.add(key);
scene.add(new THREE.DirectionalLight(0x5f8ad0, 0.7).translateX(12));

/* ---------------- the mark ---------------- */
const mark = new THREE.Group();
scene.add(mark);

const shellMat = new THREE.MeshPhysicalMaterial({
  color: 0x0d1017, metalness: 0.94, roughness: 0.22,
  envMap, envMapIntensity: 1.0, clearcoat: 1, clearcoatRoughness: 0.14,
});

/* the vessel: an open ring, cut so it reads as a drawn mark rather
   than a plain donut */
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(RING_R, 0.155, 26, 220, Math.PI * 1.62), shellMat);
ring.rotation.z = Math.PI * 0.15;
ring.castShadow = true;
mark.add(ring);

/* an inner arc, thinner and counter-rotating — gives the mark a
   second reading and something to move against */
const inner = new THREE.Mesh(
  new THREE.TorusGeometry(RING_R * 0.62, 0.075, 20, 180, Math.PI * 1.15), shellMat);
inner.rotation.z = -Math.PI * 0.4;
mark.add(inner);

/* ---------------- the three particles ---------------- */
/* One accent, not three. Three saturated colours on three spheres reads
   as a toy app icon; a logo needs colour discipline, so the particles are
   the same dark metal as the vessel and only the heat is coloured. */
const ACCENT = 0x39c8ff;
const glowMat = () => new THREE.MeshPhysicalMaterial({
  color: 0x0c1018, metalness: 0.9, roughness: 0.26,
  emissive: new THREE.Color(ACCENT), emissiveIntensity: 0.12,
  envMap, envMapIntensity: 1.0, clearcoat: 1, clearcoatRoughness: 0.16,
});

const particles = [];
const P_COLORS = [ACCENT, ACCENT, ACCENT];
for (let i = 0; i < 3; i++) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(P_R, 4), glowMat());
  m.castShadow = true;
  mark.add(m);
  const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
  particles.push({
    mesh: m,
    pos: new THREE.Vector3(Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0),
    vel: new THREE.Vector3(),
    phase: a,
    seed: i * 2.4,
  });
}

/* trails — a particle at speed should leave something behind */
const TRAIL = 26;
const trails = particles.map((p, i) => {
  const g = new THREE.BufferGeometry();
  const arr = new Float32Array(TRAIL * 3);
  for (let k = 0; k < TRAIL; k++) { arr[k * 3] = p.pos.x; arr[k * 3 + 1] = p.pos.y; }
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const line = new THREE.Line(g, new THREE.LineBasicMaterial({
    color: P_COLORS[i], transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  mark.add(line);
  return { line, g, arr, head: 0 };
});

/* ---------------- energy: the thing touch controls ---------------- */
let energy = 0;          // 0 solid · 0.5 liquid · 1 gas
let energyTarget = 0;
const pointerNDC = new THREE.Vector2(999, 999);
const pointerWorld = new THREE.Vector3(999, 999, 0);
let pointerSpeed = 0;
let pointerDown = false;

const ray = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

function onMove(x, y) {
  const nx = (x / innerWidth) * 2 - 1;
  const ny = -((y / innerHeight) * 2 - 1);
  pointerSpeed += Math.hypot(nx - pointerNDC.x, ny - pointerNDC.y) * 9;
  pointerNDC.set(nx, ny);
}
addEventListener('pointermove', e => onMove(e.clientX, e.clientY), { passive: true });
addEventListener('pointerdown', e => { pointerDown = true; onMove(e.clientX, e.clientY); pointerSpeed += 2.5; }, { passive: true });
addEventListener('pointerup', () => { pointerDown = false; }, { passive: true });
addEventListener('touchmove', e => { const t = e.touches[0]; if (t) onMove(t.clientX, t.clientY); }, { passive: true });
addEventListener('pointerleave', () => pointerNDC.set(999, 999), { passive: true });

/* ---------------- state layouts ---------------- */
const solidTargets = [
  new THREE.Vector3(-0.78, -0.45, 0),
  new THREE.Vector3(0.78, -0.45, 0),
  new THREE.Vector3(0.00, 0.92, 0),
];

const _t = new THREE.Vector3();
function targetFor(i, p, t) {
  const st = energy;

  /* SOLID — a rigid lattice, barely breathing */
  _t.copy(solidTargets[i]).multiplyScalar(1.0 + Math.sin(t * 1.1 + p.seed) * 0.012);

  if (st > 0.001) {
    /* LIQUID — loose, circulating, still bound near the centre */
    const la = t * 0.55 + p.phase;
    const liq = new THREE.Vector3(Math.cos(la) * 1.35, Math.sin(la * 1.3) * 1.05, Math.sin(la * 0.7) * 0.5);
    _t.lerp(liq, THREE.MathUtils.smoothstep(st, 0.0, 0.55));
  }
  if (st > 0.45) {
    /* GAS — free, filling the vessel, colliding with its wall */
    const ga = t * (1.5 + p.seed * 0.25) + p.phase * 2.1;
    const gas = new THREE.Vector3(
      Math.cos(ga) * RING_R * 0.72,
      Math.sin(ga * 1.7 + p.seed) * RING_R * 0.66,
      Math.sin(ga * 0.9) * 1.1,
    );
    _t.lerp(gas, THREE.MathUtils.smoothstep(st, 0.45, 1.0));
  }
  return _t;
}

/* ---------------- composer ---------------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.5, 0.95);
composer.addPass(bloom);
const out = new OutputPass();
out.toneMapping = THREE.ACESFilmicToneMapping;
composer.addPass(out);

/* ---------------- loop ---------------- */
const clock = new THREE.Clock();
const stateEl = document.getElementById('state');
const meterEl = document.getElementById('meter-fill');
const STATE_NAMES = ['SOLID', 'LIQUID', 'GAS'];

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  pointerSpeed *= Math.exp(-dt * 3.2);

  /* where the pointer is, on the mark's own plane */
  ray.setFromCamera(pointerNDC, camera);
  if (!ray.ray.intersectPlane(plane, pointerWorld)) pointerWorld.set(999, 999, 0);

  /* --- touch is heat --- */
  const dist = pointerWorld.length();
  const near = Math.exp(-Math.max(0, dist - RING_R * 0.4) * 0.42);
  const heat = near * (0.35 + Math.min(1, pointerSpeed) * 1.5 + (pointerDown ? 0.9 : 0));
  energyTarget = THREE.MathUtils.clamp(heat, 0, 1);

  /* heats fast, cools slowly — the way anything with mass does */
  const rate = energyTarget > energy ? 3.4 : 0.55;
  energy += (energyTarget - energy) * (1 - Math.exp(-dt * rate));

  /* --- integrate the particles --- */
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const target = targetFor(i, p, t);

    /* spring toward the state's layout; stiffer when cold */
    const k = 26 - energy * 12;
    p.vel.addScaledVector(_t.copy(target).sub(p.pos), k * dt);

    /* the pointer physically shoves them — this is the "feel" */
    const away = _t.copy(p.pos).sub(pointerWorld);
    const d = away.length();
    if (d < 6 && dist < 90) {
      p.vel.addScaledVector(away.normalize(), (1 - d / 6) * 46 * dt * (0.4 + pointerSpeed));
    }

    p.vel.multiplyScalar(Math.exp(-dt * (7.5 - energy * 3.2)));
    p.pos.addScaledVector(p.vel, dt);

    /* the vessel contains them */
    const r = Math.hypot(p.pos.x, p.pos.y);
    const lim = RING_R - P_R * 1.3;
    if (r > lim) {
      const n = _t.set(p.pos.x / r, p.pos.y / r, 0);
      p.pos.x = n.x * lim; p.pos.y = n.y * lim;
      const vn = p.vel.dot(n);
      if (vn > 0) p.vel.addScaledVector(n, -1.7 * vn);
    }
    p.pos.z = THREE.MathUtils.clamp(p.pos.z, -1.4, 1.4);

    p.mesh.position.copy(p.pos);
    const sp = Math.min(1, p.vel.length() * 0.09);
    p.mesh.material.emissiveIntensity = 0.10 + energy * 2.6 + sp * 1.8;
    p.mesh.scale.setScalar(1 - energy * 0.22 + sp * 0.12);

    /* trail */
    const tr = trails[i];
    tr.head = (tr.head + 1) % TRAIL;
    for (let k = TRAIL - 1; k > 0; k--) {
      tr.arr[k * 3] = tr.arr[(k - 1) * 3];
      tr.arr[k * 3 + 1] = tr.arr[(k - 1) * 3 + 1];
      tr.arr[k * 3 + 2] = tr.arr[(k - 1) * 3 + 2];
    }
    tr.arr[0] = p.pos.x; tr.arr[1] = p.pos.y; tr.arr[2] = p.pos.z;
    tr.g.attributes.position.needsUpdate = true;
    tr.line.material.opacity = Math.min(0.55, sp * 0.7 * (0.3 + energy));
  }

  /* the vessel reacts too: it opens and spins up as it heats */
  ring.rotation.z = Math.PI * 0.15 + t * (0.04 + energy * 0.45);
  inner.rotation.z = -Math.PI * 0.4 - t * (0.09 + energy * 0.85);
  inner.rotation.x = Math.sin(t * 0.5) * 0.18 * (0.3 + energy);
  mark.rotation.y = Math.sin(t * 0.24) * 0.10 + pointerNDC.x * 0.20;
  mark.rotation.x = -pointerNDC.y * 0.12;
  mark.scale.setScalar(1 + energy * 0.05);

  bloom.strength = 0.30 + energy * 0.85;

  camera.position.set(0, 0, 15.5);
  camera.lookAt(0, 0, 0);

  /* readout */
  const idx = energy < 0.30 ? 0 : energy < 0.62 ? 1 : 2;
  if (stateEl.textContent !== STATE_NAMES[idx]) stateEl.textContent = STATE_NAMES[idx];
  meterEl.style.transform = `scaleX(${energy.toFixed(3)})`;

  composer.render();
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  bloom.setSize(innerWidth, innerHeight);
});

document.getElementById('boot').classList.add('gone');
window.LOGO = { get energy() { return energy; }, set energy(v) { energy = energyTarget = v; }, scene, camera, ready: true };
tick();
