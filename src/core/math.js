/* Small shared ramps.

   Note on why these exist rather than THREE.MathUtils.smoothstep: that function
   guards with `if (x <= min) return 0`, so passing a DESCENDING range (min > max)
   to express a fade-out silently returns 0 everywhere instead of inverting. Almost
   every ramp in this film is descending — things fade as they get closer or as a
   distance shrinks — so it is worth having one that handles both directions. */

/** Smooth 0..1 ramp from `a` to `b`. `a` may be greater than `b` to invert. */
export function ramp(x, a, b) {
  if (a === b) return x >= b ? 1 : 0;
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Linear 0..1 ramp, same direction-agnostic contract as `ramp`. */
export function lramp(x, a, b) {
  if (a === b) return x >= b ? 1 : 0;
  return Math.min(1, Math.max(0, (x - a) / (b - a)));
}

/** Frame-rate independent exponential approach. */
export function approach(cur, target, dt, rate) {
  return cur + (target - cur) * (1 - Math.exp(-dt * rate));
}

/** Cheap deterministic hash, for per-instance seeds that must be stable. */
export function hash(i) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
