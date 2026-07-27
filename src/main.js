import * as THREE from 'three';
import gsap from 'gsap';

import { Lens } from './core/lens.js';
import { CameraRig } from './core/rig.js';
import { Director } from './core/director.js';
import { createTitleFrame } from './frames/f01-title.js';

/* ==================================================================
   GAS — one continuous take.
   main.js owns nothing but the wiring: a stage, a lens, a rig, a
   director, and an ordered list of frames. Every frame is a pure
   function of journey progress P, so the film can be scrubbed in
   either direction and always looks identical at the same P.
================================================================== */

const canvas = document.getElementById('stage');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  stencil: false,
});
renderer.setSize(innerWidth, innerHeight);

/* Heavy vertex work — cap the pixel ratio and let the lens do the
   perceived resolution via bloom and grain rather than raw pixels. */
let pixelRatio = Math.min(devicePixelRatio, 1.75);
renderer.setPixelRatio(pixelRatio);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x01010a);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 800);

const lens = new Lens(renderer, scene, camera);
const rig = new CameraRig(camera);
const director = new Director();

/* ------------------------------------------------------------------
   FRAME MAP
   Phase 1 ships frame 01. The remaining frames slot into this table
   and the rig, lens and director are already built to carry them.
------------------------------------------------------------------ */
const TITLE_RANGE = [0.00, 0.72];
const VOID_RANGE  = [0.78, 1.00];

const coarse = matchMedia('(pointer: coarse)').matches;
const q = new URLSearchParams(location.search);
const particleBudget = Number(q.get('p')) || (coarse ? 70000 : 220000);

const frames = [];
let title = null;

async function boot() {
  title = await createTitleFrame({
    scene,
    camera,
    rig,
    range: TITLE_RANGE,
    maxParticles: particleBudget,
  });
  frames.push(title);

  /* the take keeps moving after the word comes apart — the camera never
     cuts, it just keeps falling forward into the dark */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  rig
    .key(0.86, { pos: V(2.0, 1.4, -22), look: V(0, 0, -80), roll: 0.014, fov: 52, focus: 46 })
    .key(1.00, { pos: V(0.0, 2.2, -48), look: V(0, 0, -120), roll: 0.000, fov: 48, focus: 70, hold: true });

  title.onFormed = () => {
    /* Tween a value, not the element. The reveal and the scroll both want
       to own this opacity; multiplying two numbers we control means they
       can never fight, and an early scroll still clears the card. */
    gsap.to(hudState, { reveal: 1, duration: 1.6, ease: 'power2.out' });
    gsap.fromTo('#hud .line',
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 1.4, stagger: 0.28, ease: 'power3.out' });
  };

  /* the projection starts: black, closed bars, then the aperture opens */
  document.getElementById('boot')?.classList.add('gone');
  lens.bars = 0.5;
  lens.fade = 1;
  gsap.timeline()
    .to(lens, { fade: 0, duration: 2.0, ease: 'power2.inOut' })
    .to(lens, { bars: 0.085, duration: 2.2, ease: 'power4.inOut' }, 0.15);

  director.beat('title', ...TITLE_RANGE, {
    onUpdate: t => {
      /* the anamorphic streak opens up as the word blows apart */
      lens.streak = 0.5 + t * 0.5;
    },
  });

  const endcard = document.getElementById('endcard');
  director.beat('void', ...VOID_RANGE, {
    onEnter: () => endcard.classList.add('on'),
    onExit:  () => endcard.classList.remove('on'),
  });

  window.GAS.ready = true;
}

/* ------------------------------------------------------------------
   POINTER — parallax + custom cursor. No click targets in the film.
------------------------------------------------------------------ */
addEventListener('pointermove', e => {
  rig.setPointer(
    (e.clientX / innerWidth) * 2 - 1,
    -((e.clientY / innerHeight) * 2 - 1),
  );
  px = e.clientX; py = e.clientY;
}, { passive: true });

const cur = document.getElementById('cursor');
const dot = document.getElementById('cursor-dot');
let px = innerWidth / 2, py = innerHeight / 2, cx = px, cy = py;
document.addEventListener('pointerover', e => {
  cur.classList.toggle('hot', !!e.target.closest('a'));
});

/* ------------------------------------------------------------------
   THE PROJECTOR
------------------------------------------------------------------ */
const clock = new THREE.Clock();
const railFill = document.getElementById('rail-fill');
const hudEl = document.getElementById('hud');
const hudState = { reveal: 0 };

const smoothstep = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

let fpsAcc = 0, fpsFrames = 0, degraded = false;

function tick() {
  requestAnimationFrame(tick);

  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  const P = director.update(dt);
  const focus = rig.update(P, dt, t);

  for (const f of frames) f.update(P, dt, t);

  /* --- the lens reacts to speed: travel fast and it stretches --- */
  const speed = Math.min(1, Math.abs(director.velocity) * 2.2);
  lens.focus = focus;
  lens.aperture = 0.00062 + speed * 0.0011;
  lens.bloomStrength = 0.70 + speed * 0.50;
  lens.aberration = 0.85 + speed * 2.4;
  rig.breath = 0.5 + speed * 0.9;

  /* --- cursor --- */
  cx += (px - cx) * 0.16; cy += (py - cy) * 0.16;
  cur.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
  dot.style.transform = `translate(${px}px, ${py}px) translate(-50%, -50%)`;

  /* The title card is a title card: it belongs to the held frame, and
     it clears the moment the viewer starts travelling. */
  hudEl.style.opacity = String(hudState.reveal * (1 - smoothstep(0.015, 0.12, P)));

  railFill.style.height = (P * 100).toFixed(2) + '%';

  lens.render(t);

  /* --- adaptive quality: protect the frame rate before the pixels --- */
  if (!degraded) {
    fpsAcc += dt; fpsFrames++;
    if (fpsAcc > 3) {
      if (fpsFrames / fpsAcc < 40 && pixelRatio > 1) {
        pixelRatio = 1;
        renderer.setPixelRatio(pixelRatio);
        lens.setSize(innerWidth, innerHeight);
        for (const f of frames) f.setPixelRatio?.(pixelRatio);
      }
      degraded = true;
    }
  }
}

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  lens.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize);

boot().then(tick).catch(err => {
  console.error(err);
  document.getElementById('boot')?.classList.add('failed');
});

/* expose for tuning from the console while grading the look */
window.GAS = {
  lens, rig, director, scene, camera, renderer, frames, gsap,
  get title() { return title; },
  /* jump straight to a point in the journey, no easing */
  seek(p) { director.targetP = p; director.P = p; },
  ready: false,
};
