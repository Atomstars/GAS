import './style.css';

import Lenis from 'lenis';
import { WORK, LEDGER, THESIS, CONTACT, repoUrl, FILL } from './data/work.js';
import { hero } from './heroes.js';
import { startAtmosphere } from './bg.js';
import { startTitle } from './title.js';
import { startMotion } from './motion.js';

/* Akash Govada — portfolio.

   ── Why this is not the 3D film any more ──

   The previous build was a scroll-piloted WebGL film: nine bespoke 3D worlds, a
   screen-space gas transition, a per-shot colour grade. It was technically the more
   impressive artefact and it failed at the only job that matters here — a visitor
   reached five acts of typography before seeing a single thing that had been built,
   and the work itself was a one-line blurb and a repo link.

   So the subject is on screen from the first scroll and the copy annotates it. Motion
   is an accent: a cursor wipe, scroll-linked reveals, a sticky column that tracks the
   chapter you are reading. Nothing here blocks content on an animation finishing, and
   the whole page works with JavaScript disabled apart from the decoration.

   The film is not deleted — src/shots/* and src/core/* are still in the tree — but
   nothing imports it. */

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;

/* ---------------------------------------------------------------- scrolling */
/* Lenis stays. It is the one piece of the old build that was unambiguously right:
   native scroll on a page of full-height sections lands hard, and every reveal below
   is driven from scroll position rather than from a timeline, so smoothing the input
   smooths all of them at once. Off entirely under reduced motion — inertia the
   viewer did not ask for is exactly what that setting is about. */
/* The page opens on a title, so a restored scroll position would drop the visitor into
   the middle of a section with a fixed canvas over it. */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

let lenis = null;
if (!reduced) {
  try {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9, syncTouch: false });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  } catch (e) {
    /* Lenis intercepts the wheel. If it half-initialises it can swallow the gesture
       and leave the page unable to scroll at all — which, on a site whose first screen
       is a title, looks exactly like a site with nothing after the title. Native scroll
       is the fallback and it is never worse than not scrolling. */
    console.warn('smooth scroll unavailable, using native:', e);
    lenis?.destroy?.();
    lenis = null;
  }
}

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const el = document.querySelector(a.getAttribute('href'));
    if (!el) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(el, { offset: -24, duration: 1.1 });
    else el.scrollIntoView({ behavior: 'smooth' });
  });
});

/* ------------------------------------------------------------------ content */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
));

/* Approach */
document.getElementById('thesis-list').innerHTML = THESIS.map((t) => `
  <li class="reveal">
    <span class="idx">${esc(t.n)}</span>
    <h3>${esc(t.head)}</h3>
    <p>${esc(t.body)}</p>
  </li>`).join('');

/* The work.

   Structure per project: a sticky spec column on the left, a stack of chapter frames
   on the right. The column holds still while the chapters move past it, so the reader
   always has the project's identity, stack and links on screen — which is the thing a
   segmented, slide-by-slide layout keeps taking away and giving back. */
function linkRow(p) {
  const out = [];
  if (p.links.live) out.push(`<a class="lnk" href="${esc(p.links.live)}" target="_blank" rel="noopener">Live demo <span aria-hidden="true">↗</span></a>`);
  if (p.links.repo) out.push(`<a class="lnk" href="${esc(repoUrl(p.links.repo))}" target="_blank" rel="noopener">Source <span aria-hidden="true">↗</span></a>`);
  if (p.links.caseStudy) out.push(`<a class="lnk" href="${esc(p.links.caseStudy)}">Read the case <span aria-hidden="true">↗</span></a>`);
  /* An absent demo is stated, not hidden. A visitor notices the missing link either
     way; saying why is the difference between a gap and a reason. */
  if (!p.links.live) {
    out.push(`<p class="lnk none">${esc(p.links.liveNote || 'No public demo.')}</p>`);
  }
  return out.join('');
}

document.getElementById('work-list').innerHTML = WORK.map((p) => `
  <article class="proj" id="${esc(p.id)}" data-accent="${esc(p.accent)}" style="--accent:${esc(p.accent)}">
    <div class="proj-col">
      <div class="proj-sticky">
        <span class="proj-n">${esc(p.n)}</span>
        <h3 class="proj-name">${esc(p.name)}</h3>
        <p class="proj-claim">${esc(p.claim)}</p>
        <dl class="spec">
          <dt>Category</dt><dd>${esc(p.category)}</dd>
          <dt>Year</dt><dd>${esc(p.year)}</dd>
          <dt>Role</dt><dd>${esc(p.role)}</dd>
          <dt>Stack</dt><dd class="chips">${p.stack.map((s) => `<span>${esc(s)}</span>`).join('')}</dd>
        </dl>
        <div class="proj-links">${linkRow(p)}</div>
        <ol class="chap-nav" aria-label="Chapters in ${esc(p.name)}">
          ${p.chapters.map((c, i) => `<li data-i="${i}"><span>${esc(c.n)}</span>${esc(c.label)}</li>`).join('')}
        </ol>
      </div>
    </div>

    <div class="proj-frames">
      ${p.chapters.map((c, i) => `
        <section class="chap reveal" data-i="${i}" aria-labelledby="${esc(p.id)}-${esc(c.n)}">
          <figure class="chap-hero">${hero(c, p)}</figure>
          <div class="chap-copy">
            <p class="chap-label"><span>${esc(c.n)}</span> ${esc(c.label)}</p>
            <h4 id="${esc(p.id)}-${esc(c.n)}">${esc(c.head)}</h4>
            <p>${esc(c.body)}</p>
            ${c.aside ? `
              <dl class="aside">
                <dt>Model's job</dt><dd>${esc(c.aside.role)}</dd>
                <dt>Guardrail</dt><dd>${esc(c.aside.guardrail)}</dd>
                <dt>Not the model's</dt><dd>${esc(c.aside.notModel)}</dd>
              </dl>` : ''}
          </div>
        </section>`).join('')}
    </div>
  </article>`).join('');

/* Ledger */
document.getElementById('ledger-list').innerHTML = LEDGER.map((l) => `
  <li class="reveal">
    <a href="${esc(repoUrl(l.repo))}" target="_blank" rel="noopener">
      <span class="led-name">${esc(l.name)}</span>
      <span class="led-cat">${esc(l.category)} · ${esc(l.year)}</span>
      <span class="led-line">${esc(l.line)}</span>
      <span class="led-stack">${l.stack.map(esc).join(' · ')}</span>
      <span class="led-go" aria-hidden="true">↗</span>
    </a>
  </li>`).join('');

document.getElementById('contact-links').innerHTML = `
  <a class="cta" href="mailto:${esc(CONTACT.email)}">${esc(CONTACT.email)}</a>
  <a class="cta ghost" href="${esc(CONTACT.github)}" target="_blank" rel="noopener">github.com/Atomstars</a>`;

/* Any figure that has not been checked is rendered as a visible placeholder rather
   than quietly omitted or, worse, guessed. See VERIFY.md. */
document.querySelectorAll('.mtx-val').forEach((el) => {
  if (el.textContent.trim() === FILL) el.closest('.mtx-cell')?.classList.add('is-fill');
});

/* ------------------------------------------------ atmosphere + motion layer */
/* The page is content-first and the depth runs behind it. Neither is decoration for
   the other: the structure is what a reader needs, the atmosphere is what makes it a
   place rather than a document. */
/* Each of these is isolated.

   They were not, and it cost the whole site: one subsystem failing took the others
   with it, and because the motion layer is what un-hides content, the page rendered as
   a title and nothing else. Decoration must never be able to fail in a way that
   removes the writing. */
const safely = (name, fn) => {
  try { return fn(); } catch (e) { console.warn(`${name} unavailable:`, e); return null; }
};

const atmos = reduced ? null : safely('atmosphere', () => startAtmosphere(document.getElementById('atmos')));
if (!atmos) document.getElementById('atmos')?.remove();

/* ACT 0. The gas condenses into the wordmark as you enter the page and lets go as you
   leave it. Falls back to the plain <h1>, which is the real mark either way. */
const gasCanvas = document.getElementById('gasfield');
const gasSection = document.getElementById('gas');
const gas = reduced ? null : safely('title', () => startTitle(gasCanvas, gasSection));
if (!gas) { gasCanvas?.remove(); gasSection?.classList.add('no-gl'); }

/* The canvas is opaque and fixed, so getting it out of the way once the title is past
   cannot be the render loop's job alone — if that loop stalls, an opaque black sheet
   stays over the viewport. A scroll listener is a second, independent path to the same
   result, and scroll fires when rAF does not. */
if (gas && gasCanvas) {
  const hideIfPast = () => {
    const r = gasSection.getBoundingClientRect();
    gasCanvas.style.opacity = r.bottom < -40 ? '0' : '1';
  };
  addEventListener('scroll', hideIfPast, { passive: true });
  hideIfPast();
}

// dev handle: the condensation is time-driven, so being able to inspect it without a
// screenshot is the difference between measuring it and guessing
if (import.meta.env?.DEV && gas) window.__TITLE = gas;

/* One loop owns all of it — reveals, the hero animations, the depth, the sticky
   column's current chapter, and the colour the atmosphere is taking. It is driven from
   scroll position rather than from IntersectionObserver, because IO measured as not
   firing at all in the target browser and a page whose text only appears if an
   observer fires is a page that sometimes has no text. See src/motion.js. */
safely('motion', () => startMotion({
  reduced,
  onAccent: (hex) => atmos?.setAccent(hex),
}));

/* -------------------------------------------------------------- cursor wipe */
/* The effect you asked for, and it is genuinely an ERASE rather than a light.

   ── Why the veil LIFTS rather than darkens ──

   The obvious build is a dark veil the cursor punches holes in. On a page whose
   background is already #08090b that does nothing you can see: dark over dark. The
   first attempt also accumulated — painting low-alpha black every frame walks toward
   opaque, so leaving the mouse still for ten seconds faded the entire site out.

   So the veil is HAZE, blended with screen: it lifts the blacks, flattens the contrast
   and puts a fine grain over everything, exactly like an unclean lens. The cursor
   erases the haze, and what is revealed underneath is the page at full contrast. That
   is what "the landscape cleans" actually looks like — you are wiping the surface, not
   shining a torch through it.

   The trail is a fixed-length ring of stamps with their own lifetimes rather than an
   accumulating buffer, so the veil has a hard ceiling and cannot drift.

   Removed on touch (no cursor to follow) and under reduced motion. */
const veil = document.getElementById('veil');
if (reduced || coarse) {
  veil.remove();
} else {
  const ctx = veil.getContext('2d', { alpha: true });
  /* Half resolution. The veil is soft gradients and grain with no detail to lose, and
     a full-screen composite every frame is the one thing here that could cost real
     time on a laptop GPU. */
  const DPR = 0.5;
  /* Wide and gentle. At a tight radius and near-full erase the cleaned patch read as a
     black hole punched in the page rather than as a wiped surface — the giveaway is a
     hard-edged blob, and the fix is a brush wider than it is strong. */
  const R = 230 * DPR;
  const HAZE = 'rgba(58, 68, 92, 0.34)';

  let w = 0;
  let h = 0;
  let grain = null;

  /* One noise tile, generated once and repeated. Grain is what stops the haze reading
     as a flat grey rectangle — it gives the "dirty" state a texture to be cleaned off. */
  const makeGrain = () => {
    const g = document.createElement('canvas');
    g.width = g.height = 96;
    const gx = g.getContext('2d');
    const img = gx.createImageData(96, 96);
    for (let i = 0; i < 96 * 96; i++) {
      const v = 120 + Math.random() * 135;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 16;
    }
    gx.putImageData(img, 0, 0);
    return ctx.createPattern(g, 'repeat');
  };

  const size = () => {
    w = veil.width = Math.max(1, Math.floor(innerWidth * DPR));
    h = veil.height = Math.max(1, Math.floor(innerHeight * DPR));
    grain = makeGrain();          // the pattern is bound to the context, so rebuild it
  };
  size();
  addEventListener('resize', size);

  /* Fixed-length trail. Each stamp keeps a life, so the wipe heals on its own clock
     instead of on how often the canvas happens to be repainted. */
  const N = 26;
  const trail = Array.from({ length: N }, () => ({ x: -999, y: -999, life: 0 }));
  let head = 0;
  let lastX = -999;
  let lastY = -999;
  let mx = -999;
  let my = -999;

  addEventListener('pointermove', (e) => { mx = e.clientX * DPR; my = e.clientY * DPR; }, { passive: true });
  addEventListener('pointerleave', () => { mx = -999; my = -999; });

  const stamp = (x, y) => { trail[head] = { x, y, life: 1 }; head = (head + 1) % N; };

  let prev = performance.now();
  (function paint(now) {
    requestAnimationFrame(paint);
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;

    /* Lay stamps ALONG the segment travelled since the last frame. A fast sweep covers
       more ground than the brush is wide, and stamping only the current position
       leaves a dotted line rather than a stroke. */
    if (mx > -100) {
      if (lastX < -100) stamp(mx, my);
      else {
        const dist = Math.hypot(mx - lastX, my - lastY);
        const steps = Math.min(12, Math.max(1, Math.round(dist / (R * 0.3))));
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          stamp(lastX + (mx - lastX) * t, lastY + (my - lastY) * t);
        }
      }
      lastX = mx;
      lastY = my;
    }

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = HAZE;
    ctx.fillRect(0, 0, w, h);
    if (grain) { ctx.fillStyle = grain; ctx.fillRect(0, 0, w, h); }

    ctx.globalCompositeOperation = 'destination-out';
    for (const s of trail) {
      if (s.life <= 0) continue;
      s.life = Math.max(0, s.life - dt * 0.62);        // heals over about 1.6s
      const a = s.life * s.life;                       // holds open, then closes quickly
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, R);
      g.addColorStop(0, `rgba(0,0,0,${0.82 * a})`);
      g.addColorStop(0.45, `rgba(0,0,0,${0.30 * a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(s.x - R, s.y - R, R * 2, R * 2);
    }
  })(prev);
}

document.body.classList.add('ready');
