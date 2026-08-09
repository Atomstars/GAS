/* RACK FOCUS — SHOTLIST.md §4 R3.

   Moves attention between the type in the foreground and the world behind it without
   moving the camera at all. That is why it belongs in the vocabulary: every other move
   here changes where you are, and sometimes the honest edit is that you stayed exactly
   where you were and started looking at something else.

   A rack is asymmetric. The plane you are LEAVING goes soft faster than the plane you
   are arriving at comes sharp, because a real lens pulls through a range where neither
   is resolved. Cross-fading two sharpness values in lockstep gives a dissolve, not a
   rack — the giveaway is that the frame is never soft.

   ── What exists now, and what does not ──
   This returns the timing and the per-plane sharpness. There is no depth-of-field pass
   in the composer yet, and adding one is a P3 decision made against a real world rather
   than in the abstract (`Post` is also on the do-not-rewrite list, so it gets amended
   once, deliberately, not incrementally). Until then a shot spends `fgSharp`/`bgSharp`
   on what it already has: type opacity and glow, line opacity, and the bloom weight in
   its grade. That is a weaker rack than a real one and it is honest about being so —
   but the CURVE is the part that has to be right, and it is right here. */

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const easeInOut = (t) => t * t * (3 - 2 * t);

/**
 * @param {number} p 0..1 through the pull. 0 = foreground sharp, 1 = background sharp.
 * @param {object} [o]
 * @param {number} [o.near] world distance of the foreground plane
 * @param {number} [o.far]  world distance of the background plane
 * @returns {{
 *   focus: number,   world distance the lens is focused at
 *   fgSharp: number, 1..0 foreground resolution
 *   bgSharp: number, 0..1 background resolution
 *   through: number, 0..1, peaks where NEITHER plane is sharp — the pull itself
 * }}
 */
export function rackFocus(p, { near = 6, far = 90 } = {}) {
  const t = clamp01(p);
  const k = easeInOut(t);

  // focus travels through the range; the eye reads the SPEED of this, so it eases
  const focus = near + (far - near) * k;

  // the plane being left lets go early, the plane being found arrives late
  const fgSharp = 1 - clamp01(t / 0.62);
  const bgSharp = clamp01((t - 0.34) / 0.66);

  const through = clamp01(1 - fgSharp - bgSharp);

  return { focus, fgSharp, bgSharp, through };
}
