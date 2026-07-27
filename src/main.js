import * as THREE from 'three';
import gsap from 'gsap';

import { Lens } from './core/lens.js';
import { CameraRig } from './core/rig.js';
import { Director } from './core/director.js';
import { Pointer } from './core/pointer.js';
import { loadFont } from './core/text3d.js';
import { SHARED } from './core/material.js';
import { PROJECTS, repoUrl } from './data/projects.js';
import { createTitleFrame } from './frames/f01-title.js';
import { createCraftFrame } from './frames/f02-craft.js';
import { createProjectFrames } from './frames/f03-projects.js';

/* ==================================================================
   GAS — one continuous take.
   Everything is a pure function of journey progress P ∈ [0,1].
   Nothing is clicked. Scroll travels; the pointer disturbs.
================================================================== */

const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
renderer.setSize(innerWidth, innerHeight);

let pixelRatio = Math.min(devicePixelRatio, 1.75);
renderer.setPixelRatio(pixelRatio);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02030a);

const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 1400);

const lens = new Lens(renderer, scene, camera);
const rig = new CameraRig(camera);
const director = new Director();
const pointer = new Pointer(camera);

const coarse = matchMedia('(pointer: coarse)').matches;
const q = new URLSearchParams(location.search);
const particleBudget = Number(q.get('p')) || (coarse ? 45000 : 120000);

/* ---------------- the route ---------------- */
const R_TITLE   = [0.000, 0.130];
const R_CRAFT   = [0.155, 0.300];
const R_PROJECT = [0.330, 0.940];
const R_END     = [0.955, 1.000];
const CRAFT_Z = -95, PROJ_START_Z = -215, PROJ_STEP_Z = 105;

const frames = [];
let title = null, craft = null, projectFrames = [];

/* Frame boundaries — the moments the film changes place. */
const BOUNDS = [R_TITLE[1], R_CRAFT[0], R_CRAFT[1], R_PROJECT[0]];

async function boot() {
  await loadFont();

  title = await createTitleFrame({
    scene, camera, renderer, rig, pointer,
    range: R_TITLE, maxParticles: particleBudget,
  });
  frames.push(title);

  craft = createCraftFrame({
    scene, renderer, rig, pointer,
    range: R_CRAFT, center: new THREE.Vector3(0, 0, CRAFT_Z),
  });
  frames.push(craft);

  projectFrames = createProjectFrames({
    scene, camera, renderer, rig, pointer, projects: PROJECTS,
    range: R_PROJECT, startZ: PROJ_START_Z, stepZ: PROJ_STEP_Z,
  });
  frames.push(...projectFrames);
  projectFrames.forEach(f => BOUNDS.push(f.p0));

  /* the take keeps falling forward after the last project */
  const lastZ = PROJ_START_Z - (PROJECTS.length - 1) * PROJ_STEP_Z;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  rig
    .key(0.965, { pos: V(0, 6, lastZ - 70),  look: V(0, 0, lastZ - 150), roll: 0.010, fov: 50, focus: 60 })
    .key(1.000, { pos: V(0, 10, lastZ - 118), look: V(0, -2, lastZ - 220), roll: 0, fov: 47, focus: 90, hold: true });

  title.onFormed = () => gsap.to(hudState, { reveal: 1, duration: 1.5, ease: 'power2.out' });
  title.onSet = () => {
    gsap.fromTo('#hud .line', { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 1.2, stagger: 0.24, ease: 'power3.out' });
  };

  document.getElementById('boot')?.classList.add('gone');
  lens.bars = 0.5;
  lens.fade = 1;
  gsap.timeline()
    .to(lens, { fade: 0, duration: 1.8, ease: 'power2.inOut' })
    .to(lens, { bars: 0.075, duration: 2.0, ease: 'power4.inOut' }, 0.15);

  window.GAS.ready = true;
}

/* ---------------- DOM ---------------- */
const hudEl    = document.getElementById('hud');
const craftEl  = document.getElementById('craft');
const panelEl  = document.getElementById('panel');
const endEl    = document.getElementById('endcard');
const railFill = document.getElementById('rail-fill');
const hudState = { reveal: 0 };

const smoothstep = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

let shownProject = -1;
function setProjectPanel(i) {
  if (i === shownProject) return;
  shownProject = i;
  if (i < 0) { panelEl.classList.remove('on'); return; }
  const p = PROJECTS[i];
  document.getElementById('p-index').textContent = `${String(i + 1).padStart(2, '0')} / ${String(PROJECTS.length).padStart(2, '0')}`;
  document.getElementById('p-kind').textContent = p.kind;
  document.getElementById('p-desc').textContent = p.desc;
  document.getElementById('p-tags').innerHTML = p.tags.map(t => `<i>${t}</i>`).join('');
  const link = document.getElementById('p-link');
  link.href = repoUrl(p);
  panelEl.classList.add('on');
  gsap.fromTo(panelEl, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' });
}

/* ---------------- projector ---------------- */
const clock = new THREE.Clock();
let fpsAcc = 0, fpsFrames = 0, degraded = false;

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  const P = director.update(dt);
  pointer.update(dt);

  const focus = rig.update(P, dt, t);
  rig.setPointer(pointer.smooth.x, pointer.smooth.y);

  /* the liquid surfaces all read one pointer */
  SHARED.uTime.value = t;
  SHARED.uPointer.value.copy(pointer.world);
  SHARED.uPointerAmp.value = pointer.rippleAmp;

  for (const f of frames) f.update(P, dt, t);

  /* --- which frame owns the pointer's focus plane --- */
  let active = title;
  for (const f of projectFrames) if (P >= f.p0 && P <= f.p1) active = f;
  if (P > R_CRAFT[0] && P < R_CRAFT[1]) active = craft;
  pointer.setFocusPlane(active?.focusPlane ?? 0);

  /* --- THE SHIFT ---
     Crossing between frames is an event, not a dissolve: the surfaces
     go momentarily molten and the lens flares and stretches. It scales
     with how hard the viewer is travelling, so a slow scroll gets a
     gentle handover and a fast one gets a jolt. */
  let nearBoundary = 0;
  for (const b of BOUNDS) nearBoundary = Math.max(nearBoundary, 1 - smoothstep(0, 0.030, Math.abs(P - b)));
  const speed = Math.min(1, Math.abs(director.velocity) * 2.2);
  const shift = nearBoundary * (0.25 + speed * 0.75);

  SHARED.uMelt.value = shift * 1.5;

  lens.focus = focus;
  lens.aperture = 0.00055 + speed * 0.0009;
  lens.bloomStrength = 0.30 + speed * 0.22 + shift * 0.55;
  lens.aberration = 0.55 + speed * 1.6 + shift * 3.4;
  lens.streak = 0.42 + shift * 0.85;
  rig.breath = 0.42 + speed * 0.8;
  if (shift > 0.85 && speed > 0.55) rig.impulse(0.05);

  /* --- DOM --- */
  hudEl.style.opacity = String(hudState.reveal * (1 - smoothstep(0.012, 0.10, P)));
  craftEl.style.opacity = String(
    smoothstep(R_CRAFT[0] + 0.012, R_CRAFT[0] + 0.055, P) * (1 - smoothstep(R_CRAFT[1] - 0.05, R_CRAFT[1], P))
  );
  craftEl.classList.toggle('on', P > R_CRAFT[0] && P < R_CRAFT[1]);

  let pi = -1;
  for (let i = 0; i < projectFrames.length; i++) {
    const f = projectFrames[i];
    if (P >= f.p0 + (f.p1 - f.p0) * 0.06 && P <= f.p1 - (f.p1 - f.p0) * 0.10) pi = i;
  }
  setProjectPanel(pi);

  const endOp = smoothstep(R_END[0], R_END[0] + 0.03, P);
  endEl.style.opacity = String(endOp);
  endEl.classList.toggle('on', endOp > 0.5);

  railFill.style.height = (P * 100).toFixed(2) + '%';

  lens.render(t);

  if (!degraded) {
    fpsAcc += dt; fpsFrames++;
    if (fpsAcc > 3.5) {
      if (fpsFrames / fpsAcc < 38 && pixelRatio > 1) {
        pixelRatio = 1;
        renderer.setPixelRatio(pixelRatio);
        lens.setSize(innerWidth, innerHeight);
        for (const f of frames) f.setPixelRatio?.(pixelRatio);
      }
      degraded = true;
    }
  }
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  lens.setSize(innerWidth, innerHeight);
});

window.GAS = {
  lens, rig, director, pointer, scene, camera, renderer, frames, gsap, SHARED,
  get title() { return title; },
  seek(p) { director.targetP = p; director.P = p; },
  ready: false,
};

boot().then(tick).catch(err => {
  console.error(err);
  const b = document.getElementById('boot');
  if (b) { b.classList.add('failed'); b.textContent = 'failed — ' + err.message; }
});
