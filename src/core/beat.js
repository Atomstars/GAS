/* The dwell model — SHOTLIST.md §4 R2.

   The old motion model was `camZ = (p) => Z0 + (Z1 - Z0) * p`: camera position as a
   LINEAR function of scroll. Every beat therefore scaled and slid for the entire time
   it was on screen and none of them ever arrived. There was no frame in the film, only
   a pan, and that is what made it read as a ride rather than as a cut.

   The fix is not easing the whole shot — an eased lerp still never rests. It is making
   position a SEGMENTED function of scroll with flat regions in it:

       TRAVEL → ARRIVE → DWELL → DEPART → (travel) → ARRIVE → DWELL → …

   During DWELL the station parameter is exactly constant, so the camera is parked and
   the type is stationary at final size. That is the whole idea, and everything else in
   here is bookkeeping around it.

   Nothing in this module imports three.js. It is pure arithmetic over scalars so it can
   be exercised from the dev harness without a GL context. */

import { ramp } from './math.js';

/* Share of a beat's scroll slice spent travelling in, parked, and departing.
   These are per-beat, so they are also the shot-wide shares: a five-beat shot spends
   44% of its scroll parked, whatever the beat count. */
export const BEAT_BUDGET = Object.freeze({ travel: 0.28, dwell: 0.44, depart: 0.28 });

/** R2's floor. A shot that parks for less than this is a pan wearing a costume. */
export const DWELL_MIN = 0.35;

/* Rest-to-rest transits ease at both ends: you leave a stop and you arrive at one.
   The entry into the shot and the exit out of it only ease at the inside end, because
   the far end of those is a gas cut, which already has all the velocity it needs. */
const easeInOut = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - (1 - t) ** 2.2;
const easeIn = (t) => t ** 2.2;

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * Where a shot is, given how far the viewer has scrolled through it.
 *
 * @param {number} localP  0..1 within the shot — pass `shot.clearP(localP)`, not the raw
 *   value, or the first and last beats land inside the gas cut at either end
 * @param {number} count   how many beats the shot has
 * @param {object} [o]
 * @param {boolean} [o.hold] hold the last beat instead of departing from it. Every shot
 *   boundary in this film is a gas cut, and a cut lands better ON a beat than on the
 *   empty set the camera left behind — HANDOFF trap 7 is the same lesson learned the
 *   hard way ("stop short and hold"; both acts ended on an empty frame).
 * @returns {{
 *   u: number,        station parameter. Integer i === parked at beat i. Runs -1..count,
 *                     where -1 and count are the virtual stations outside the first and
 *                     last beat — see `stationAt`.
 *   index: number,    the beat currently being read (or most recently read)
 *   phase: 'travel'|'dwell'|'depart',
 *   dwell: number,    1 while parked, easing to 0 across each transit. Drive post
 *                     effects and the letterbox off THIS, not off `phase`.
 *   beatP: number,    0..1 through the current dwell; 0 outside one
 *   moving: number,   1 - dwell, i.e. how much flight is happening
 * }}
 */
export function beatCurve(localP, count, { hold = false, budget = BEAT_BUDGET } = {}) {
  const n = Math.max(1, count | 0);
  const p = clamp01(localP);

  /* Enforce R2's floor here rather than trusting every call site. A shot asking for a
     0.2 dwell gets 0.35 and keeps its travel/depart in proportion. */
  let { travel: tf, dwell: df } = budget;
  if (df < DWELL_MIN) {
    const room = (1 - DWELL_MIN) / (1 - df);
    tf *= room;
    df = DWELL_MIN;
  }
  const rest = 1 - tf - df;              // the depart share

  const slice = 1 / n;
  const i = Math.min(n - 1, Math.floor(p / slice));
  const q = p / slice - i;               // 0..1 within this beat's slice

  const dwellStart = tf;
  // the last beat's depart becomes more dwell when the shot is held open for the cut
  const dwellEnd = (hold && i === n - 1) ? 1 : tf + df;

  let u;
  let phase;
  let beatP = 0;

  if (q >= dwellStart && q <= dwellEnd) {
    // parked. This is the flat region, and it is the point of the whole module.
    u = i;
    phase = 'dwell';
    const width = dwellEnd - dwellStart;
    beatP = width <= 0 ? 1 : (q - dwellStart) / width;
  } else if (q > dwellEnd) {
    phase = 'depart';
    if (i === n - 1) {
      u = i + easeIn(clamp01((q - dwellEnd) / rest));         // out of the shot
    } else {
      // first half of the transit to the next beat; the second half is the `q < dwellStart`
      // branch of the NEXT slice, so the two are one continuous eased move
      const span = rest + tf;
      u = i + easeInOut(clamp01((q - dwellEnd) / span));
    }
  } else {
    phase = 'travel';
    if (i === 0) {
      u = -1 + easeOut(clamp01(q / tf));                      // into the shot
    } else {
      const span = rest + tf;
      u = (i - 1) + easeInOut(clamp01((rest + q) / span));
    }
  }

  /* `dwell` is not `phase === 'dwell'`. A hard 0/1 would snap the letterbox and the
     aberration on and off at the segment boundary; a shoulder either side of the flat
     region gives them something to ease across while the camera is still nearly still. */
  const shoulder = df * 0.28;
  const a = i * slice + dwellStart * slice;
  const b = i * slice + dwellEnd * slice;
  const dwell = ramp(p, a - shoulder * slice, a) * ramp(p, b + shoulder * slice, b);

  return { u, index: i, phase, dwell, beatP, moving: 1 - dwell };
}

/**
 * Map a station parameter to a position along an array of beat stations.
 *
 * `u` may run from -1 to `stations.length`, i.e. one virtual station off each end.
 * Those are extrapolated from the first and last real gap so a shot never has to
 * hand-write its entry and exit positions — and, more usefully, so the approach into
 * beat 0 and the departure past the last beat are the same kind of move as every
 * transit in between.
 *
 * @param {number[]} stations
 * @param {number} u
 * @param {{entry?: number, exit?: number}} [o] virtual station distance, as a fraction
 *   of the adjacent real gap. Kept under 1 because those two moves get half the scroll.
 */
export function stationAt(stations, u, { entry = 0.5, exit = 0.35 } = {}) {
  const n = stations.length;
  if (n === 1) return stations[0];

  if (u <= 0) {
    const virt = stations[0] + (stations[0] - stations[1]) * entry;
    return virt + (stations[0] - virt) * clamp01(u + 1);
  }
  if (u >= n - 1) {
    const virt = stations[n - 1] + (stations[n - 1] - stations[n - 2]) * exit;
    return stations[n - 1] + (virt - stations[n - 1]) * clamp01(u - (n - 1));
  }
  const i = Math.floor(u);
  return stations[i] + (stations[i + 1] - stations[i]) * (u - i);
}

/**
 * How present a beat is, given where the camera is.
 *
 * Written against `u` rather than against distance-to-camera on purpose. Distance made
 * every beat's life depend on the geometry it happened to be sitting in, which is why
 * HANDOFF trap 5 exists: a block is frame-filling ~7 units out, so a fade tied to
 * distance was still running while the camera was inside the letters. Tied to `u`, a
 * beat is guaranteed to be dark by the time the lens reaches its plane, in every shot,
 * whatever the spacing.
 *
 * @returns {{opacity: number, wipe: number, read: number}}
 *   `wipe` is -1 once complete, which is what Text.js takes for "fully lit".
 */
export function beatPresence(u, i) {
  const d = u - i;                       // <0 approaching, 0 parked, >0 past

  const arrive = ramp(d, -0.95, -0.32);  // resolves out of the far dark
  const clear = ramp(d, 0.55, 0.06);     // and is GONE before the lens arrives
  /* Depth hierarchy: the beat behind the one being read is a ghost, not a competitor.
     Type in this film is additive, so anything still lit is read THROUGH the letters
     in front of it.

     The ghost floor has to release EARLY, though, or it collides with HANDOFF trap 6.
     Held to -0.12 it kept the incoming beat at 0.12 opacity through the middle of every
     transit — and since the outgoing beat is gone by then, that is an empty frame in
     the one place the old build already had one. Released at -0.25 the two windows
     overlap: the outgoing beat is still clearing while the incoming one is already
     legible, so something is always readable. */
  const read = 0.12 + 0.88 * ramp(d, -0.72, -0.25);

  // the reveal must FINISH before the dwell starts, i.e. comfortably before d = 0,
  // or a frame grabbed at rest catches the film mid-wipe
  const w = clamp01((d + 0.9) / 0.55);

  return { opacity: arrive * clear * read, wipe: w >= 1 ? -1 : w, read };
}

/**
 * Ambient drift for a parked camera. R2 allows ≤0.4 units of translation during a
 * dwell — enough that the frame is alive, not enough that the type moves under the
 * reader. Two decorrelated frequencies per axis so it never resolves as a sine.
 *
 * @param {number} t   the shot's scaled clock
 * @param {number} amp peak magnitude per axis, capped at 0.4
 */
export function dwellDrift(t, amp = 0.34) {
  const a = Math.min(amp, 0.4);
  return {
    x: (Math.sin(t * 0.31) * 0.72 + Math.sin(t * 0.77) * 0.28) * a,
    y: (Math.cos(t * 0.27) * 0.70 + Math.cos(t * 0.63) * 0.30) * a,
    roll: Math.sin(t * 0.19) * 0.006,
  };
}

/** Total share of a shot's scroll spent parked. Assert it in review; R2 floor is 0.35. */
export function dwellShare(budget = BEAT_BUDGET) {
  return Math.max(DWELL_MIN, budget.dwell);
}

/* The floor on how long one station-to-station move may take, in seconds.

   Same problem MIN_GAS_SECONDS solves, and it was left unsolved here at first: the
   station parameter is scroll-DRIVEN, and a beat-to-beat transit is about 9vh of
   scroll. A wheel flick covers that in two or three frames, so the camera teleported
   52 units and swapped headlines between frames — measured as the film reading "too
   quick and not smooth" precisely where it was meant to read as an edit.

   At reading pace this never engages: the eased curve is already slower than the
   limit, so `u` tracks the scroll exactly and a dwell parks on an exact integer,
   which the whole model depends on. It only bites under a flick. */
export const MIN_BEAT_SECONDS = 1.25;

/** Ceiling on how fast the camera may cross stations, however hard the wheel is spun. */
const MAX_SPEED = 2.2;

/**
 * Smoothed, rate-limited station parameter.
 *
 * The first version of this was a pure rate LIMIT — clamp the step, done. It stopped
 * the teleporting, and the motion still read as unsmooth, because a clamp produces
 * constant velocity: the camera snapped from stopped to full speed, held it, and
 * snapped back to stopped. The eye reads acceleration, not position, and a clamp has
 * none. The eased curve underneath it was irrelevant the moment the clamp engaged,
 * which is exactly when the viewer is looking.
 *
 * So: a critically damped spring. It has no overshoot, its acceleration is continuous
 * everywhere, and it slows into a station instead of arriving at one. `MAX_SPEED`
 * still caps a hard flick, and the snap at the bottom guarantees the exact rest that
 * R2's dwell depends on — a spring only ever approaches its target asymptotically,
 * and "almost parked" is not parked.
 *
 * @param {{u:number, v:number}} state mutated in place
 */
export function paceU(state, target, dt, period = MIN_BEAT_SECONDS) {
  // a long frame must not be allowed to integrate the spring into instability
  const h = Math.min(dt, 1 / 30);
  const w = 3.4 / period;

  state.v += (w * w * (target - state.u) - 2 * w * state.v) * h;
  if (state.v > MAX_SPEED) state.v = MAX_SPEED;
  else if (state.v < -MAX_SPEED) state.v = -MAX_SPEED;
  state.u += state.v * h;

  /* Snap generously.

     A critically damped spring only approaches its target, so where you decide it has
     ARRIVED is a real choice. At 0.0015 the visible move finished in about a second
     and the spring then crept for another two and a half before it latched — which
     nobody could see, but the letterbox and the aberration key off the dwell, so the
     frame sat in travel state long after it had plainly stopped travelling. 0.006 of a
     station is 0.3 units of camera z: below the ambient drift the parked camera has
     anyway. */
  if (Math.abs(target - state.u) < 0.006 && Math.abs(state.v) < 0.05) {
    state.u = target;
    state.v = 0;
  }
  return state.u;
}
