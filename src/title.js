import * as THREE from 'three';
import { TitleShot } from './shots/TitleShot.js';
import { Post } from './core/Post.js';
import { input, initInput, updateInput } from './core/Input.js';

/* ACT 0 — GAS. The original shot, hosted on the new page.

   ── Why this imports the old film instead of reimplementing it ──

   I rebuilt this once as a hand-written single-pass shader and it was a worse thing in
   every respect. What makes the original work is not "noise shaped like letters" — it
   is four decisions that took real time to find, all of which my rebuild lost:

     · the letterform is an ATTRACTOR, not a mask. It biases the density THRESHOLD, so
       gas near a glyph condenses sooner and the boundary is still drawn by the noise.
       A mask stamps a hard-edged letter out of a cloud texture, which is the 2005
       Photoshop version of this and the wrong image besides — the brief is gas
       condensing INTO letters, not letters cut from gas.
     · condensed core, turbulent boundary. Running noise through the whole letterform
       makes it look dirty; confining the turbulence to the edge is what reads as
       condensation and is the only way the core can carry light.
     · one key light, from screen-space derivatives of the density. Free normals, no
       extra noise samples, and it is what gives the gas form instead of a flat fill.
     · two layers at different depths, so pointer parallax shears them against each
       other and the letters gain real volume.

   So `src/shots/TitleShot.js` is imported unchanged, and so are `Post` and `Grade` —
   the bloom and the colour grade are part of that frame, not a filter on it. This file
   is only the host: a renderer, a scroll-driven clock, and the pointer.

   Cost, stated plainly: this pulls three.js and postprocessing into the bundle for one
   section. That is the price of it being literally the same shot rather than an
   impression of it. */

export function startTitle(canvas, section) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,            // the composer multisamples instead
      powerPreference: 'high-performance',
      stencil: false,
    });
  } catch {
    return null;
  }

  /* The pixel-ratio cap from the film, and for the same reason: every pixel here goes
     through two 4-octave noise fields and then a mipmap bloom, and ratio is the one
     knob that cuts that cost quadratically. */
  const touch = matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1.25 : 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.NoToneMapping;      // tone mapping happens in the composer
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 1);

  const shot = new TitleShot();
  shot.ensureBuilt();
  shot.setSize(innerWidth, innerHeight);

  const post = new Post(renderer, shot.scene, shot.camera);
  post.snapGrade(shot.grade);
  post.setDwell(0);
  post.fade = 0;                                   // open from black, as the film did

  initInput();

  const resize = () => {
    renderer.setSize(innerWidth, innerHeight);
    shot.setSize(innerWidth, innerHeight);
    post.setSize(innerWidth, innerHeight);
  };
  addEventListener('resize', resize);

  /* The condensation is driven here rather than by the shot's own gsap tween.

     Same curve, same 3.4s after a 0.5s beat — but gsap's ticker pauses with document
     visibility, and this is the first thing anyone sees. A visitor who opens the site
     in a background tab and switches to it would otherwise arrive at a half-condensed
     frame that then jumps. Measured in a hidden context, the tween had reached 0.247
     after five seconds. Owning the clock also makes the shot deterministic, which is
     what lets it be checked without a screenshot. */
  const COND_DELAY = 0.5;
  const COND_DUR = 3.4;
  const power2InOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);

  /* WALL CLOCK, not accumulated deltas.

     Summing per-frame deltas makes the intro's duration a function of the frame rate,
     because any sane delta is clamped to stop one long frame teleporting the camera —
     so under a throttled rAF the clock runs slow. Measured: the condensation reached
     0.35 after 5.4s of real time against a 3.9s intro.

     A timestamp is exact at any frame rate. The only thing it gets wrong is a visitor
     who opens the page in a background tab, so the hidden interval is subtracted on
     return and they see the intro from where they left it rather than arriving at a
     wordmark that already finished condensing without them. */
  let condStart = null;
  let hiddenAt = 0;

  let entered = false;
  let running = true;
  const t0 = performance.now();
  let prev = t0;

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (document.hidden) {
      hiddenAt = performance.now();
    } else {
      // rebase the intro so the time spent away does not count against it
      if (condStart !== null && hiddenAt) condStart += performance.now() - hiddenAt;
      hiddenAt = 0;
      prev = performance.now();
      requestAnimationFrame(frame);
    }
  });

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const raw = (now - prev) / 1000;
    prev = now;
    /* Two clocks, deliberately.

       `dt` is clamped hard at 50ms because it drives the shot's motion, and one long
       frame must not teleport the camera. But the intro TIMER cannot use that clamp:
       under a throttled rAF the frames are further apart than the clamp allows, so
       accumulating clamped deltas runs the clock slow — measured, the condensation
       reached 0.029 in 4.6s of wall time instead of finishing.

       The intro timer does not use either of these — see the wall clock above. */
    const dt = Math.min(0.05, raw);

    const r = section.getBoundingClientRect();
    /* Once the title is off screen there is nothing to draw and this is the most
       expensive pass on the page — two full-frame 4-octave fields plus a HUGE-kernel
       bloom. The rest of the site has its own atmosphere to pay for. */
    if (r.bottom < -40) {
      canvas.style.opacity = '0';
      return;
    }
    canvas.style.opacity = '1';

    updateInput(dt);

    /* Local progress through the section, which is what the shot's own `update` was
       always written against — it pushes the camera in and then releases the gas
       outward past 0.55. Scrub back up and it re-condenses, because none of it is a
       timeline. */
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));

    // claim the shot's reveal flag so its own tween can never also fire
    if (!entered) { entered = true; shot.revealed = true; }

    if (condStart === null) condStart = now;
    const elapsed = (now - condStart) / 1000;
    const cp = Math.min(1, Math.max(0, (elapsed - COND_DELAY) / COND_DUR));
    shot.cond = power2InOut(cp);
    if (cp >= 1) document.body.classList.add('title-in');

    // the film opened from black over 1.6s; keep it, it is the first frame anyone sees
    post.fade = Math.min(1, elapsed / 1.6);

    const t = (now - t0) / 1000;
    shot.update(dt, t, p);

    post.update(dt);
    post.render();
  }
  requestAnimationFrame(frame);

  return { shot, renderer };
}
