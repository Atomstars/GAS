/* Motion policy — one place that decides how much of the film's motion is
   non-negotiable and how much is decoration.

   The whole site IS motion, so `prefers-reduced-motion` cannot mean "hold still".
   What it can mean is: nothing moves unless the viewer moved it. So the split is
   between motion the viewer DRIVES (the camera's travel down each world, which is
   scroll position and stops the instant they stop) and motion that runs on its own
   (handheld drift, precession, particulate, scroll inertia, the velocity smear).
   The second kind is what gets cut.

   Every shot's idle drift is written as sin(t * k), so scaling the `t` that shots
   are handed damps all nine of them at once. That matters more than elegance here:
   a policy applied in one place cannot be forgotten in shot number ten. */

const query = matchMedia('(prefers-reduced-motion: reduce)');
const coarse = matchMedia('(pointer: coarse)');

export const motion = {
  reduced: query.matches,

  /* Idle drift is scaled rather than frozen. Several worlds animate their actual
     SUBJECT on this clock — the agent traversing the graph, packets moving through
     the café pipeline — and freezing it would not reduce motion so much as delete
     the content. Slow enough to stop reading as movement, alive enough to still be
     a world. */
  get timeScale() { return this.reduced ? 0.12 : 1; },

  /* Pointer parallax: pure decoration, and it moves the frame with no scroll input
     at all, so it goes entirely. */
  get parallax() { return this.reduced ? 0 : 1; },

  /* The full-frame directional smear is the most aggressive effect in the stack. */
  get smear() { return this.reduced ? 0 : 1; },

  /* The gas cut stays — it is the brand, and it is scroll-driven — but its
     advection is damped so the frame churns rather than thrashes. */
  get churn() { return this.reduced ? 0.4 : 1; },

  /* Scroll smoothing is inertia the viewer did not ask for: the page keeps moving
     after they stop. Off means native scroll, which is what they configured. */
  get smoothScroll() { return !this.reduced; },

  get touch() { return coarse.matches; },
};

/** Notify on change so the page can re-configure without a reload. */
export function onMotionChange(fn) {
  query.addEventListener('change', (e) => { motion.reduced = e.matches; fn(motion); });
}
