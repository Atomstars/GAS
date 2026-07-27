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

import { TitleShot } from './shots/TitleShot.js';
import { ThesisShot } from './shots/ThesisShot.js';
import { DavinaShot } from './shots/DavinaShot.js';
import { JobAgentShot } from './shots/JobAgentShot.js';
import { CafePosShot } from './shots/CafePosShot.js';
import { HousingShot } from './shots/HousingShot.js';
import { BuddyShot } from './shots/BuddyShot.js';
import { GmatShot } from './shots/GmatShot.js';
import { ContactShot } from './shots/ContactShot.js';

/* GAS — cinematic scroll-piloted portfolio.
   Architecture: SHOTLIST.md. Scroll is the only verb. */

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
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.NoToneMapping;   // tone mapping happens in the composer
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 1);

const assets = new Assets(renderer);

/* -------------------------------- shots -------------------------------- */
const shots = new ShotSystem();
shots.add(new TitleShot());
shots.add(new ThesisShot());
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

/* ------------------------------- scrolling ------------------------------ */
document.getElementById('scroll-space').style.height = `${shots.totalVh}vh`;

const lenis = new Lenis({
  smoothWheel: true,
  lerp: 0.075,
  wheelMultiplier: 0.9,
  touchMultiplier: 1.6,
});

function progress() {
  const max = document.documentElement.scrollHeight - innerHeight;
  return max <= 0 ? 0 : THREE.MathUtils.clamp(window.scrollY / max, 0, 1);
}

/* --------------------------------- size --------------------------------- */
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  shots.setSize(w, h);
  post.setSize(w, h);
  const dpr = Math.min(devicePixelRatio, 2);
  gas.setSize(Math.floor(w * dpr), Math.floor(h * dpr));
}
addEventListener('resize', resize);
resize();

/* --------------------------------- loop --------------------------------- */
const clock = new THREE.Clock();
initInput();

let prevP = 0;
let smoothVel = 0;

function frame(time) {
  requestAnimationFrame(frame);
  lenis.raf(time);

  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const P = progress();

  updateInput(dt);

  // scroll velocity -> visible smear. normalised so a brisk flick reads ~1.
  const dP = P - prevP;
  prevP = P;
  const raw = Math.min(1, Math.abs(dP) / (dt || 0.016) / 0.55);
  smoothVel += (raw - smoothVel) * (1 - Math.exp(-dt * (raw > smoothVel ? 14 : 5)));
  if (Math.abs(dP) > 1e-6) input.dir = Math.sign(dP);
  input.vel = smoothVel;
  post.setVelocity(smoothVel, input.dir);

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
}
requestAnimationFrame(frame);

/* open from black once the first frame is genuinely on screen */
requestAnimationFrame(() => {
  gsap.to(post, { fade: 1, duration: 1.6, ease: 'power2.out', delay: 0.15 });
  document.body.classList.add('ready');
});

/* dev-only handle for inspecting shots without a screenshot */
if (import.meta.env?.DEV) {
  window.__GAS = { THREE, renderer, shots, post, gas, overlay, lenis, progress };
  import('./dev/harness.js').then((m) => m.installHarness(window.__GAS));
}

/* ------------------------------- cursor -------------------------------- */
const cursor = document.getElementById('cursor');
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
