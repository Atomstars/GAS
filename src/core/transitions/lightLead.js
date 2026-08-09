/* LIGHT-LEAD — SHOTLIST.md §4 R3.

   Continuity. A moving key light runs AHEAD of the camera and drags the next set into
   existence: by the time the camera arrives, the thing it is arriving at is already
   lit, so the set was always there and you simply had not reached it yet.

   This is the cheapest of the five moves and the one that does the most for the film's
   biggest structural problem — that the old build lit each world independently and so
   read as six unrelated set pieces on a black field. A light that crosses the boundary
   is a single continuous space either side of it.

   SHOTLIST §4 rule 3 (one key light, everything else falling to black) is unchanged
   here. This does not add a second key. It moves the one that exists. */

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const easeInOut = (t) => t * t * (3 - 2 * t);

/**
 * @param {number} p 0..1 through the move the camera is making
 * @param {object} [o]
 * @param {number} [o.lead]   how far ahead of the camera the light runs, in units of
 *   the move. 0.3 means the light is 30% further along than the camera for most of it.
 * @param {number} [o.settle] where in `p` the light stops leading and lets the camera
 *   catch up. Before this the set ahead is lighting; after it, the light belongs to
 *   the frame the camera has arrived in.
 * @returns {{
 *   k: number,      0..1 the camera's own eased progress
 *   lightK: number, 0..1 the light's progress. >= k until `settle`, equal after.
 *   ahead: number,  lightK - k, i.e. how far in front the key currently is
 *   warm: number,   0..1 crossfade weight for the incoming set's accent colour.
 *                   Lerp the key's colour on this and the palette arrives before the
 *                   camera does, which is the point.
 *   spill: number,  peaks mid-move — light thrown back at the set being left
 * }}
 */
export function lightLead(p, { lead = 0.3, settle = 0.78 } = {}) {
  const t = clamp01(p);
  const k = easeInOut(t);

  // the lead tapers to zero at `settle`, so the light does not overshoot the set and
  // then walk backwards into it — which is what a constant offset would do
  const taper = 1 - clamp01(t / settle);
  const lightK = Math.min(1, k + lead * taper * (1 - k * 0.35));

  return {
    k,
    lightK,
    ahead: lightK - k,
    warm: clamp01(lightK * 1.12),
    spill: Math.sin(Math.PI * t) ** 1.4,
  };
}
