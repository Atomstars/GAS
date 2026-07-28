import { motion } from './motion.js';

/* Shared, smoothed input state. Shots read this for pointer parallax and
   pointer-reactive shaders; Post reads velocity for the scroll smear.

   The first build had NO pointer reactivity at all — scroll was the only verb,
   taken so literally that the frame was inert under the cursor. It should not be. */

export const input = {
  // pointer, normalised to -1..1, smoothed
  px: 0, py: 0,
  tx: 0, ty: 0,
  // pointer in 0..1 uv space, smoothed (for shaders)
  ux: 0.5, uy: 0.5,
  // pointer presence 0..1 (fades out when the cursor leaves)
  presence: 0,
  tPresence: 0,
  // scroll
  vel: 0,        // 0..1 normalised speed
  dir: 1,        // -1 up, +1 down
};

export function initInput() {
  addEventListener('pointermove', (e) => {
    input.tx = (e.clientX / innerWidth) * 2 - 1;
    input.ty = -((e.clientY / innerHeight) * 2 - 1);
    input.tPresence = 1;
  }, { passive: true });

  addEventListener('pointerleave', () => { input.tPresence = 0; });
  addEventListener('blur', () => { input.tPresence = 0; });

  // touch drag should feel like pointer too
  addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (!t) return;
    input.tx = (t.clientX / innerWidth) * 2 - 1;
    input.ty = -((t.clientY / innerHeight) * 2 - 1);
    input.tPresence = 1;
  }, { passive: true });
  addEventListener('touchend', () => { input.tPresence = 0; });
}

export function updateInput(dt) {
  const k = 1 - Math.exp(-dt * 5.0);
  // gated here rather than in each shot: every world reads px/py for parallax,
  // so zeroing it at the source is what makes the policy impossible to miss
  const par = motion.parallax;
  input.px += (input.tx * par - input.px) * k;
  input.py += (input.ty * par - input.py) * k;
  input.presence += (input.tPresence - input.presence) * (1 - Math.exp(-dt * 3.0));
  input.ux = input.px * 0.5 + 0.5;
  input.uy = input.py * 0.5 + 0.5;
}
