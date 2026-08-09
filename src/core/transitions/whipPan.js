/* WHIP-PAN MATCH CUT — SHOTLIST.md §4 R3.

   The move BETWEEN beats inside a world. A world is one continuous place, so beats
   cannot gas-cut to each other — that would say the world ended five times. A whip
   is the opposite claim: same room, the camera turned.

   The shape that matters is the velocity, not the angle. A whip is almost entirely
   its middle: it leaves slowly, covers 80% of the rotation in the middle third, and
   settles slowly. An eased rotation over a constant time reads as a pan; this reads
   as a snap of the head. The smear peaks where the angular rate does, which is what
   hides the cut and lets the last shape of the outgoing beat rhyme with the first
   shape of the incoming one (SHOTLIST §2, still in force).

   Drives rotation and the existing velocity smear. No new pass. */

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

/* A quintic that is flat at both ends and steep through the middle. Its derivative
   peaks at 1.875x the mean rate, which is the whole effect. */
const snap = (t) => t * t * t * (t * (t * 6 - 15) + 10);

/**
 * @param {number} p 0..1 through the move
 * @param {object} [o]
 * @param {number} [o.yaw]   total rotation, radians. Sign picks the direction.
 * @param {number} [o.roll]  peak roll at the midpoint — a whip that stays level is a slide
 * @returns {{
 *   k: number,      0..1 eased position between the two beats
 *   yaw: number,    radians to add to the camera's heading
 *   roll: number,   radians of z-roll, peaking mid-move
 *   rate: number,   0..1 normalised angular rate — feed to the velocity smear
 *   blind: number,  0..1, 1 at the point where the frame is least legible.
 *                   The place to swap anything that must not be seen changing.
 * }}
 */
export function whipPan(p, { yaw = 0.42, roll = 0.05 } = {}) {
  const t = clamp01(p);
  const k = snap(t);

  // derivative of the quintic, normalised so its peak is 1
  const rate = clamp01((30 * t * t * (t - 1) * (t - 1)) / 1.875);

  return {
    k,
    yaw: yaw * k,
    roll: roll * Math.sin(Math.PI * t),
    rate,
    blind: rate,
  };
}
