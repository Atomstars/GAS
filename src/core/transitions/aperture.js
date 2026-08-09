/* APERTURE — SHOTLIST.md §4 R3.

   Used in exactly one place: entering a project from THE WALL. The visitor chose this
   world, so the transition has to honour the choice rather than dissolve it. The gas
   cut is a statement that a world ENDED; this is a statement that a door was opened.

   The move: the window bounded by the carved title dilates past the frame edge while
   the camera pushes through it and the lens widens. Two things are happening at once
   and they must not be in phase — the dilation leads, the push follows, so for the
   first third the frame is a hole opening rather than a camera lunging.

   Returns numbers only. The shot decides what to do with them, because the geometry
   of a window differs between the wall and whatever else ever needs one. */

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const easeIn = (t) => t ** 2.4;
const easeInOut = (t) => t * t * (3 - 2 * t);

/**
 * @param {number} p 0..1 through the transition
 * @param {object} [o]
 * @param {number} [o.fov0] the wall's lens
 * @param {number} [o.fov1] the lens at the moment of passing through
 * @returns {{
 *   dilate: number,   1 = the window at its carved size, growing past ~14 = off-frame
 *   push: number,     0..1 of the camera's travel toward and through the window plane
 *   fov: number,      degrees
 *   wallFade: number, 1..0 — the monolith goes as the hole takes the frame
 *   worldIn: number,  0..1 — the destination world coming up behind the letters
 *   flare: number,    peaks at the threshold; feed it to bloom or the edge emission
 * }}
 */
export function aperture(p, { fov0 = 30, fov1 = 52 } = {}) {
  const t = clamp01(p);

  // the hole opens first, and it opens FAST — a linear dilation reads as a zoom,
  // an accelerating one reads as falling
  const dilate = 1 + easeIn(t) * 13;

  // the push lags the dilation by ~0.18 so the first frames are the wall opening,
  // not the camera charging it
  const push = easeInOut(clamp01((t - 0.18) / 0.82));

  // the lens widens as we cross the threshold: the frame's own geometry changes,
  // which is what sells passing through something rather than arriving at it
  const fov = fov0 + (fov1 - fov0) * easeIn(t);

  const wallFade = 1 - clamp01((t - 0.22) / 0.5);
  const worldIn = clamp01((t - 0.12) / 0.62);

  // the threshold itself — brightest at the instant the letters pass the lens
  const flare = Math.sin(Math.PI * clamp01((t - 0.35) / 0.5)) ** 1.6;

  return { dilate, push, fov, wallFade, worldIn, flare };
}
