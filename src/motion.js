/* THE MOTION LAYER — one loop, driven by scroll position.

   ── Why this does not use IntersectionObserver ──

   It did, and everything on the page stayed invisible. Measured in the target browser:
   an element occupying the full viewport, observed at threshold 0.35, produced ZERO
   callbacks in 500ms. Reveals never fired, the hero animations never started, and
   because a reveal begins at opacity 0 the failure mode was not "no animation" — it
   was a blank page with the content still in the DOM.

   That is too fragile a thing to hang content visibility on, in any browser. Whether a
   paragraph can be READ must not depend on an API firing. So everything here is driven
   from scroll position in a single rAF loop, which is the same signal the parallax
   already needs and is impossible not to fire.

   The cost of doing it this way is that positions have to be cached — reading
   getBoundingClientRect per element per frame is a forced synchronous layout sixty
   times a second. So geometry is measured once, on resize, and after fonts land (they
   reflow every block below them). The loop then only does arithmetic and writes
   transform, opacity and filter, none of which trigger layout.

   Under prefers-reduced-motion nothing runs and everything is placed immediately. */

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

/* THE FRAME CURVE — why the page does not slide.

   A linear map from scroll to transform is a pan: every frame is moving for the whole
   time it is on screen, nothing ever arrives, and the eye never gets a still image to
   read. That is the difference between a long tracking shot and an edit, and it is the
   single thing that makes this feel like a page rather than a film.

   So each frame's travel is SEGMENTED, with a flat region in the middle:

       TRAVEL 0.00–0.32   the frame flies in from depth
       DWELL  0.32–0.68   position is EXACTLY constant. the frame is a still
       DEPART 0.68–1.00   it recedes and hands over

   During the dwell the transform is not eased toward rest, it IS rest — the same value
   every frame — so the type is stationary at final size and can simply be read. A beat
   that never comes to rest was never a frame.

   @returns -1 at full travel-in, 0 through the dwell, +1 at full departure
*/
/* 0.22 / 0.78, not 0.32 / 0.68.

   At the longer travel the two frames either side of a boundary were BOTH near the end
   of their curve at the same moment, and the screen went black between them — measured
   as a fully empty frame mid-transition. That is a dissolve through black, not a cut,
   and it is the same empty-frame failure this project has now hit in three different
   materials. Shorter travel means the outgoing frame is still legible when the
   incoming one arrives, and 56% of every chapter's scroll is spent at a dead stop. */
const TRAVEL = 0.22;
const DEPART = 0.78;
function frameCurve(p) {
  if (p < TRAVEL) return -(1 - ease(p / TRAVEL));
  if (p > DEPART) return ease((p - DEPART) / (1 - DEPART));
  return 0;
}

export function startMotion({ reduced, onAccent }) {
  /* Everything visible-by-default, and only hidden once we know we can un-hide it.
     `js` on the root is what switches the reveal styles on, so a failed script leaves
     a readable page rather than an empty one. */
  if (reduced) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
    document.querySelectorAll('[data-anim]').forEach((el) => el.classList.add('run'));
    return;
  }
  /* ---------------------------------------------------------- the watchdog */
  /* `js-motion` is what hides content until the loop reveals it. So before adding it,
     arm a dead-man switch that takes it back off if the loop has not ticked.

     This is not defensive padding — it is the exact failure that shipped. In a document
     where requestAnimationFrame never fires (measured: zero ticks in a full second),
     the reveal loop never runs, nothing gets `.in`, and every section below the title
     sits at opacity 0. The page looked like it had one screen and no content.

     No animation is a cosmetic loss. Invisible content is the site not existing. If
     those two are ever in tension the animation loses, automatically, without needing
     me to have predicted the reason. */
  let ticked = false;
  const watchdog = setTimeout(() => {
    if (ticked) return;
    console.warn('motion: no frame in 1.2s — showing all content unanimated');
    document.documentElement.classList.remove('js-motion');
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
    document.querySelectorAll('[data-anim]').forEach((el) => el.classList.add('run'));
  }, 1200);

  document.documentElement.classList.add('js-motion');

  /* And reveal whatever is already on screen SYNCHRONOUSLY, before any frame is asked
     for. What a visitor can see at the moment the page loads must never depend on an
     animation frame arriving. */
  {
    const fold = innerHeight * 1.05;
    for (const el of document.querySelectorAll('.reveal')) {
      if (el.getBoundingClientRect().top < fold) el.classList.add('in');
    }
  }

  /* ------------------------------------------------------------- geometry */
  const chaps = [...document.querySelectorAll('.chap')].map((chap) => ({
    chap,
    hero: chap.querySelector('.chap-hero'),
    copy: chap.querySelector('.chap-copy'),
    top: 0,
    h: 0,
  }));
  const reveals = [...document.querySelectorAll('.reveal')].map((el) => ({ el, top: 0, done: false }));
  const anims = [...document.querySelectorAll('[data-anim]')].map((el) => ({ el, top: 0, h: 0, done: false }));
  const projs = [...document.querySelectorAll('.proj')].map((el) => ({
    el, top: 0, h: 0, accent: el.dataset.accent,
    navs: [...el.querySelectorAll('.chap-nav li')],
    chapTops: [...el.querySelectorAll('.chap')],
  }));

  const measure = () => {
    const y = scrollY;
    for (const c of chaps) {
      const r = c.chap.getBoundingClientRect();
      c.top = r.top + y;
      c.h = r.height;
    }
    for (const r of reveals) r.top = r.el.getBoundingClientRect().top + y;
    for (const a of anims) {
      const r = a.el.getBoundingClientRect();
      a.top = r.top + y;
      a.h = r.height;
    }
    for (const p of projs) {
      const r = p.el.getBoundingClientRect();
      p.top = r.top + y;
      p.h = r.height;
      p.tops = p.chapTops.map((c) => c.getBoundingClientRect().top + y);
    }
  };
  measure();
  addEventListener('resize', measure);
  addEventListener('load', measure);
  document.fonts?.ready.then(measure);
  /* Images and late layout shifts happen for a while after load; a few cheap
     re-measures beat one that is subtly wrong for the life of the page. */
  for (const ms of [400, 1200, 2500]) setTimeout(measure, ms);

  /* -------------------------------------------------------------- pointer */
  let px = 0.5;
  let py = 0.5;
  let mx = 0.5;
  let my = 0.5;
  addEventListener('pointermove', (e) => {
    mx = e.clientX / innerWidth;
    my = e.clientY / innerHeight;
  }, { passive: true });

  let accentShown = null;
  let prev = performance.now();

  /* ------------------------------------------------- revealing, redundantly */
  /* Whether a paragraph can be read gets TWO independent drivers, because it turned
     out one was not enough in either direction: IntersectionObserver never fired, and
     the rAF loop can tick once — clearing a one-shot watchdog — and then stop, which is
     exactly what a backgrounded tab does after first paint.

     So this runs from the loop AND from a scroll listener. Scroll events fire when rAF
     is throttled; rAF fires when nothing is scrolling. Between them there is no state
     in which content stays hidden. Each entry is one-shot, so the cost decays to zero. */
  const revealPass = () => {
    const y = scrollY;
    const vh = innerHeight;
    for (const r of reveals) {
      if (r.done) continue;
      if (r.top < y + vh * 0.92 || r.top < y) { r.el.classList.add('in'); r.done = true; }
    }
    for (const a of anims) {
      if (a.done) continue;
      if (a.top < y + vh * 0.78 && a.top + a.h > y) {
        a.el.classList.add('run');
        if (a.el.dataset.anim === 'count') countUp(a.el);
        a.done = true;
      }
    }
  };
  addEventListener('scroll', revealPass, { passive: true });
  revealPass();

  /* Started by requestAnimationFrame ONLY — never called directly.

     It used to prime itself with a synchronous first call, which quietly defeated the
     watchdog above: that call marked the loop as ticked and cleared the timer before
     rAF had been tested at all. The guard then proved nothing, and in a document where
     rAF never fires the site still rendered as a title and fifteen invisible chapters.
     The only tick that counts as evidence is one the browser scheduled. */
  function loop(now) {
    requestAnimationFrame(loop);
    if (!ticked) { ticked = true; clearTimeout(watchdog); }
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;

    const y = scrollY;
    const vh = innerHeight;

    const k = 1 - Math.exp(-dt * 5);
    px = lerp(px, mx, k);
    py = lerp(py, my, k);
    // one shared tilt: a per-element angle makes every card point somewhere different,
    // which reads as noise rather than as a room
    const tiltY = (px - 0.5) * 7;
    const tiltX = (0.5 - py) * 4;

    revealPass();

    /* ---- FRAME TO FRAME ----

       Each chapter flies in from depth, comes to a complete stop while you read it,
       then recedes and hands over to the next. The numbers are large because this is
       meant to read as an edit: 520px of z travel is a frame arriving from somewhere,
       40px is a card nudging. During the dwell every one of them is exactly zero. */
    for (const c of chaps) {
      if (!c.hero) continue;
      const p = (y + vh - c.top) / (vh + c.h);
      if (p < -0.2 || p > 1.2) continue;                 // off screen: leave it alone

      const f = frameCurve(clamp01(p));                  // -1 .. 0 .. +1
      const away = Math.abs(f);
      const incoming = f < 0;

      /* Incoming frames arrive from below and behind; outgoing ones recede upward and
         further back. Asymmetric on purpose — a frame that leaves the way it came in
         reads as a bounce rather than as a cut. */
      const tz = incoming ? f * 420 : -f * 240;
      const ty = incoming ? -f * 110 : -f * 76;
      const rx = incoming ? -f * 11 : -f * 7.5;

      c.hero.style.transform =
        `translate3d(0, ${ty.toFixed(1)}px, ${tz.toFixed(1)}px) `
        + `rotateX(${(rx + tiltX * (1 - away)).toFixed(2)}deg) `
        + `rotateY(${(tiltY * (1 - away)).toFixed(2)}deg)`;
      /* Depth of field: only the frame at rest is sharp. The floors matter — a frame
         that fades to nothing leaves the screen empty at every boundary, so an
         off-rest frame stays at 40% and 4px rather than disappearing. It reads as
         out of focus, which is the point, rather than as absent. */
      c.hero.style.filter = away > 0.02
        ? `blur(${(away * 4.5).toFixed(1)}px) brightness(${(1 - away * 0.34).toFixed(3)})`
        : '';
      c.hero.style.opacity = (1 - away * 0.6).toFixed(3);

      /* The copy travels less and slower than the hero it belongs to. That rate
         difference is the only cue a flat page has for "these are at different
         distances", and it is what stops the pair reading as one flat card. */
      if (c.copy) {
        c.copy.style.transform = `translate3d(0, ${(-f * 38).toFixed(1)}px, 0)`;
        c.copy.style.opacity = (1 - away * 0.7).toFixed(3);
      }
    }

    /* ---- which project is on screen, and which chapter inside it ---- */
    const mid = y + vh * 0.5;
    for (const p of projs) {
      if (mid < p.top || mid > p.top + p.h) continue;

      if (p.accent !== accentShown) {
        accentShown = p.accent;
        onAccent?.(p.accent);
      }
      // the sticky column tells you where you are, so it is never just decoration
      let cur = 0;
      for (let i = 0; i < p.tops.length; i++) if (p.tops[i] < mid + vh * 0.2) cur = i;
      for (let i = 0; i < p.navs.length; i++) p.navs[i].classList.toggle('on', i === cur);
    }
  }
  requestAnimationFrame(loop);
}

/* Metrics count up to their value.

   Only for figures that are actually numeric. A value of '[FILL]' is left exactly as
   written — a placeholder that animated would read as a real measurement, which is the
   one thing this site must never do. */
function countUp(el) {
  const target = el.textContent.trim();
  if (!/^[\d.,]+$/.test(target)) return;
  const num = Number(target.replace(/,/g, ''));
  if (!Number.isFinite(num) || num <= 0) return;

  const dur = 900;
  const t0 = performance.now();
  el.textContent = '0';
  const step = (now) => {
    const t = clamp01((now - t0) / dur);
    el.textContent = t < 1 ? String(Math.round(num * (1 - (1 - t) ** 3))) : target;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
