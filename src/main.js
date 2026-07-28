import './style.css';

import * as THREE from 'three';
import Lenis from 'lenis';
import gsap from 'gsap';

import { Assets } from './core/Assets.js';
import { input, initInput, updateInput } from './core/Input.js';
import { Post } from './core/Post.js';
import { GasTransition } from './core/GasTransition.js';
import { ShotSystem } from './core/ShotSystem.js';
import { Overlay } from './ui/Overlay.js';
import { motion, onMotionChange } from './core/motion.js';

import { TitleShot } from './shots/TitleShot.js';
import { ThesisShot } from './shots/ThesisShot.js';
import { GateShot } from './shots/GateShot.js';
import { DavinaShot } from './shots/DavinaShot.js';
import { JobAgentShot } from './shots/JobAgentShot.js';
import { CafePosShot } from './shots/CafePosShot.js';
import { HousingShot } from './shots/HousingShot.js';
import { BuddyShot } from './shots/BuddyShot.js';
import { GmatShot } from './shots/GmatShot.js';
import { ContactShot } from './shots/ContactShot.js';

/* GAS — cinematic scroll-piloted portfolio.
   Architecture: SHOTLIST.md. Scroll is the only verb. */

/* One boot per page, enforced.

   Nothing in this module is idempotent: it constructs a WebGLRenderer, starts a
   requestAnimationFrame loop and installs a Lenis instance. If the module is ever
   evaluated twice — a stray second import, or an HMR update that re-runs it rather
   than reloading the page — the second copy does not replace the first, it runs
   ALONGSIDE it. Two render loops then compete for the GPU and both drive scroll,
   and the page gets progressively heavier with each occurrence, which reads
   exactly like the dev server "getting stuck". */
if (window.__GAS_BOOTED) {
  console.warn('GAS: already booted; ignoring duplicate module evaluation.');
  throw new Error('GAS already booted');
}
window.__GAS_BOOTED = true;

if (import.meta.hot) import.meta.hot.decline();   // full reload, never a hot swap

history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

/* ------------------------------ renderer ------------------------------ */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,          // the composer multisamples instead
  powerPreference: 'high-performance',
  stencil: false,
});
/* Phones run this whole stack — nine worlds, a half-float composer and a HUGE
   mipmap bloom — on a tile GPU with a fraction of the fill rate, and the pixel
   ratio is the one knob that cuts cost quadratically. 1.5 on a coarse-pointer
   display is still above the panel's effective resolving power for this material. */
/* Pixel ratio is the one knob that cuts cost quadratically, and this film is the
   best possible case for spending it: every frame goes through bloom, grain,
   vignette and chromatic aberration, all of which destroy the high-frequency
   detail that a 2x buffer exists to preserve. At dpr 2 the title alone was
   shading ~100M simplex-noise evaluations per frame. 1.5 is 44% fewer pixels for
   no visible loss on this material. */
renderer.setPixelRatio(Math.min(devicePixelRatio, motion.touch ? 1.25 : 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.NoToneMapping;   // tone mapping happens in the composer
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 1);

const assets = new Assets(renderer);

/* -------------------------------- shots -------------------------------- */
const shots = new ShotSystem();
shots.add(new TitleShot());
shots.add(new ThesisShot());
shots.add(new GateShot());          // the junction: rooms before the work
shots.add(new DavinaShot(assets));
shots.add(new JobAgentShot());
shots.add(new CafePosShot());
shots.add(new HousingShot());
shots.add(new BuddyShot());
shots.add(new GmatShot());
shots.add(new ContactShot());
shots.layout();

const first = shots.shots[0];
first.ensureBuilt();

const post = new Post(renderer, first.scene, first.camera);
post.snapGrade(first.grade);
post.fade = 0;                                  // open from black

const gas = new GasTransition(renderer);
const overlay = new Overlay(shots);
// the gate's buttons scroll via Lenis so a jump feels like flight, not a snap
queueMicrotask(() => { overlay.lenis = lenis; });

/* ------------------------------- scrolling ------------------------------ */
document.getElementById('scroll-space').style.height = `${shots.totalVh}vh`;

/* Smoothed scroll is inertia the viewer did not ask for — the page carries on
   after they stop. Under prefers-reduced-motion it hands back to native scroll. */
const lenis = new Lenis({
  smoothWheel: motion.smoothScroll,
  syncTouch: false,
  lerp: motion.smoothScroll ? 0.075 : 1,
  wheelMultiplier: 0.9,
  touchMultiplier: 1.6,
});

function progress() {
  const max = document.documentElement.scrollHeight - innerHeight;
  return max <= 0 ? 0 : THREE.MathUtils.clamp(window.scrollY / max, 0, 1);
}

/* --------------------------------- size --------------------------------- */
/* A hidden/zero-height viewport reports innerWidth 0, which sizes the drawing
   buffer to 1x1 — every render then goes into a single pixel. Harmless in a real
   browser window, fatal for offscreen review, so the floor is unconditional. */
function resize(w = innerWidth || 1280, h = innerHeight || 720) {
  renderer.setSize(w, h);
  shots.setSize(w, h);
  post.setSize(w, h);
  const dpr = Math.min(devicePixelRatio, 2);
  gas.setSize(Math.floor(w * dpr), Math.floor(h * dpr));
}
addEventListener('resize', () => resize());   // the Event must not land in `w`
resize();

/* --------------------------------- loop --------------------------------- */
const clock = new THREE.Clock();
initInput();

let prevP = 0;
let smoothVel = 0;
let showTime = 0;

/* The body of the loop, separated from the rAF pump so it can be stepped
   deterministically. This is the REAL path — Lenis, the velocity smear and all —
   not a harness reimplementation of it, so driving `tick` verifies what ships. */
function tick(time, forcedDt) {
  lenis.raf(time);

  const dt = forcedDt ?? Math.min(clock.getDelta(), 0.05);
  showTime += dt;
  const t = showTime;
  const P = progress();

  updateInput(dt);

  // scroll velocity -> visible smear. normalised so a brisk flick reads ~1.
  const dP = P - prevP;
  prevP = P;
  const raw = Math.min(1, Math.abs(dP) / (dt || 0.016) / 0.55);
  smoothVel += (raw - smoothVel) * (1 - Math.exp(-dt * (raw > smoothVel ? 14 : 5)));
  if (Math.abs(dP) > 1e-6) input.dir = Math.sign(dP);
  input.vel = smoothVel;
  post.setVelocity(smoothVel * motion.smear, input.dir);

  const r = shots.update(P, dt, t);

  let turbulence = 0;
  if (r.mix === null) {
    post.setScene(r.from.scene, r.from.camera);
    post.setGrade(r.from.grade);
  } else {
    // the outgoing world atomizes, the gas churns, the next world recondenses
    turbulence = GasTransition.envelope(r.mix);
    gas.capture(r.from, r.to);
    gas.set(r.mix, t, r.mix < 0.5 ? r.from.edgeColor : r.to.edgeColor);
    post.setScene(gas.scene, gas.camera);
    post.setGrade(r.mix < 0.5 ? r.from.grade : r.to.grade);
  }
  post.setTurbulence(turbulence);
  post.update(dt);
  post.render();

  overlay.update(P, r, turbulence);
  return { P, dt, t, r, vel: smoothVel, turbulence };
}

function frame(time) {
  requestAnimationFrame(frame);
  tick(time);
}
requestAnimationFrame(frame);

/* open from black once the first frame is genuinely on screen */
requestAnimationFrame(() => {
  gsap.to(post, { fade: 1, duration: 1.6, ease: 'power2.out', delay: 0.15 });
  document.body.classList.add('ready');
});

/* the OS setting can change while the page is open */
onMotionChange((m) => {
  lenis.options.lerp = m.smoothScroll ? 0.075 : 1;
  lenis.options.smoothWheel = m.smoothScroll;
  gas.material.uniforms.uChurn.value = m.churn;
});
gas.material.uniforms.uChurn.value = motion.churn;

/* ---------------------------- warm the film ----------------------------
   Lazy building meant every world was constructed synchronously at the exact
   moment the viewer first scrolled into it — measured 78ms for Davina, 70ms for
   GMAT, 53ms for Housing, ~310ms in total. Each one is a hard freeze of the main
   thread landing mid-scroll, which is what the film read as: stalling, catching,
   never smooth.

   So build them ahead of time, one per idle slot, so the cost lands in the gaps
   between frames instead of under the viewer's hand. `ensureBuilt` stays the
   fallback: scroll faster than the warm-up and the shot still builds on demand,
   exactly as before. */
(async function warm() {
  // arrow, not a bare reference: requestIdleCallback throws Illegal Invocation
  // when detached from window
  const idle = () => new Promise((res) => (window.requestIdleCallback
    ? window.requestIdleCallback(res, { timeout: 1500 })
    : setTimeout(res, 32)));

  for (const shot of shots.shots) {
    if (!shot.built) {
      await idle();
      shot.ensureBuilt();
    }

    /* And COMPILE. This is the half that actually mattered.

       Building a shot creates its geometry and materials, but WebGL does not
       compile and link a program until that material is first RENDERED — so the
       stall simply moved from "the first time the shot is built" to "the first
       frame the shot is visible", which is the same moment in the scroll. Measured
       first-render cost per shot: Housing 532ms, Title 313ms, Davina 304ms, Thesis
       283ms, against ~13-18ms steady state. Half a second of frozen main thread,
       landing exactly as the viewer scrolls into a world.

       compileAsync hands the linking to the driver without blocking (it uses
       KHR_parallel_shader_compile where available). */
    await idle();
    await renderer.compileAsync?.(shot.scene, shot.camera);

    /* Then render it once, off-screen, into a spare half-float target.

       compileAsync alone is not quite enough: three.js keys a program partly on
       the state of the render target it will be drawn into, so compiling against
       the default framebuffer can produce a variant the composer then has to
       compile again. Drawing into the gas transition's own buffer is the same
       format the composer and every transition use, so this warms the variant that
       is actually going to be needed — and it costs nothing extra, because the
       real work was already done by compileAsync above. */
    await idle();
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(gas.rtFrom);
    renderer.render(shot.scene, shot.camera);
    renderer.setRenderTarget(prev);
  }
})();

/* dev-only handle for inspecting shots without a screenshot */
if (import.meta.env?.DEV) {
  window.__GAS = { THREE, renderer, shots, post, gas, overlay, lenis, progress, tick, resize };
  import('./dev/harness.js').then((m) => m.installHarness(window.__GAS));
}

/* ------------------------------- cursor -------------------------------- */
/* The custom cursor is hidden on touch and under reduced motion, so neither its
   rAF loop nor its listeners should exist there — it was writing a transform every
   frame, forever, to an element nobody could see. */
const cursor = document.getElementById('cursor');
if (!motion.touch && !motion.reduced) {
  let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
  addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; });
  (function cursorLoop() {
    requestAnimationFrame(cursorLoop);
    cx += (mx - cx) * 0.18;
    cy += (my - cy) * 0.18;
    cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
  })();
  document.addEventListener('pointerover', (e) => {
    cursor.classList.toggle('hot', !!e.target.closest('a'));
  });
} else {
  cursor.remove();
}
