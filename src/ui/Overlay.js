import { PROJECTS, repoUrl, CATEGORIES } from '../data/projects.js';

/* The DOM layer. It is deliberately thin: telemetry lives in the 3D scene, and
   this carries only what type does better than geometry — the name, the claim,
   and the one link. Everything here is driven by shot state, never by clicks. */

const $ = (s) => document.querySelector(s);

/* Write to the DOM only when the value actually changed.

   This layer is updated every frame from the render loop. Assigning textContent or
   a style property is not free even when the value is identical — it dirties the
   element and invites style/layout work on a page that is also driving WebGL. At
   60fps, on half a dozen nodes, that is thousands of redundant mutations a second
   for a caption that changes about nine times in the whole film. */
const setText = (el, v) => { if (el && el.__v !== v) { el.__v = v; el.textContent = v; } };
const setStyle = (el, prop, v) => {
  if (!el) return;
  const k = `__s_${prop}`;
  if (el[k] !== v) { el[k] = v; el.style[prop] = v; }
};

export class Overlay {
  constructor(shots) {
    this.shots = shots;

    this.hud = $('#hud');
    this.act = $('#act');
    this.titleCopy = $('#title-copy');
    this.caption = $('#caption');
    this.cat = $('#caption .cat');
    this.name = $('#caption .name');
    this.blurb = $('#caption .blurb');
    this.stack = $('#caption .stack');
    this.open = $('#caption .open');
    this.contact = $('#contact-copy');
    this.railFill = $('#rail-fill');
    this.railLabel = $('#rail-label');

    this.gateTargets = $('#gate-targets');
    this.shown = null;
    this.buildRail();
    this.buildIndex();
    this.buildGate();
  }

  /* The gate's click targets.

     Built once and then only repositioned each frame, because these anchor to
     moving 3D portals and rebuilding them per frame would thrash the DOM on the
     one shot that already carries the most type. Each button scrolls to the first
     project of its room, and the destination is derived from the shot layout, so
     it stays correct however many projects are added later. */
  buildGate() {
    if (!this.gateTargets) return;
    this.gateButtons = new Map();
    for (const cat of CATEGORIES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'gate-target';
      b.innerHTML = `<span class="gt-n">${cat.n}</span><span class="gt-go">ENTER ↗</span>`;
      b.setAttribute('aria-label', `Jump to ${cat.label}`);
      b.addEventListener('click', () => this.jumpToRoom(cat.id));
      this.gateTargets.appendChild(b);
      this.gateButtons.set(cat.id, b);
    }
  }

  /** Scroll to the first project world belonging to a room. */
  jumpToRoom(roomId) {
    const target = this.shots.shots.find((s) => s.data?.room === roomId);
    if (!target) return;
    const max = document.documentElement.scrollHeight - innerHeight;
    // land just inside the shot, past its incoming gas transition
    const y = (target.start + (target.end - target.start) * 0.16) * max;
    if (this.lenis) this.lenis.scrollTo(y, { duration: 1.6 });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  }

  /** Follow the 3D portals. Called from the render loop while the gate is live. */
  placeGate(gate, live) {
    if (!this.gateButtons) return;
    if (!live) {
      if (this.gateWasLive) {
        for (const b of this.gateButtons.values()) b.classList.remove('live');
        this.gateWasLive = false;
      }
      return;
    }
    this.gateWasLive = true;
    for (const a of gate.anchors()) {
      const b = this.gateButtons.get(a.id);
      if (!b) continue;
      const on = a.infront && a.opacity > 0.35;
      b.classList.toggle('live', on);
      if (!on) continue;
      setStyle(b, 'transform', `translate(${a.x.toFixed(2)}vw, ${a.y.toFixed(2)}vh) translate(-50%,-50%)`);
      setStyle(b, 'opacity', a.opacity.toFixed(2));
    }
  }

  /* The text layer of record — see the note on #index in index.html. Built from
     PROJECTS rather than written into the markup so that the crawlable copy and
     the film can never disagree about what the work is. */
  buildIndex() {
    const list = $('#index-work');
    if (!list) return;
    list.innerHTML = PROJECTS.map((p) => `
      <li>
        <h3>${p.name}</h3>
        <p>${p.category} — ${p.role}</p>
        <p>${p.blurb}</p>
        <p>Built with: ${p.stack.join(', ')}.</p>
        <p><a href="${repoUrl(p.repo)}" rel="noopener">${p.name} source repository</a></p>
      </li>`).join('');
  }

  /* The rail is the route. Every shot gets a tick, and the six project worlds get
     a numbered stop, so the whole journey is legible as one line with the work
     strung along it rather than as an anonymous scrollbar. */
  buildRail() {
    const rail = $('#rail-ticks');
    if (!rail) return;
    this.stops = new Map();
    for (const s of this.shots.shots) {
      const tick = document.createElement('i');
      tick.style.top = `${s.start * 100}%`;
      if (s.data) {
        tick.classList.add('stop');
        tick.dataset.n = String(s.data.index).padStart(2, '0');
        this.stops.set(s.id, tick);
      }
      rail.appendChild(tick);
    }
  }

  fill(shot) {
    if (this.shown === shot.id) return;
    this.shown = shot.id;
    const d = shot.data;
    if (!d) return;
    this.cat.textContent = d.category;
    this.name.textContent = d.name;
    this.blurb.textContent = d.blurb;
    this.stack.innerHTML = d.stack.map((s) => `<li>${s}</li>`).join('');
    this.open.href = repoUrl(d.repo);
  }

  update(P, r, turbulence) {
    // the gate's targets track their portals only while the gate is on screen
    const gateShot = r.mix === null ? r.from : (r.mix < 0.5 ? r.from : r.to);
    if (gateShot.id === 'gate' && gateShot.built) {
      this.placeGate(gateShot, turbulence < 0.25);
    } else if (this.gateWasLive) {
      this.placeGate(null, false);
    }

    const cur = r.mix === null ? r.from : (r.mix < 0.5 ? r.from : r.to);

    // during a gas transition the type blows away with everything else
    const settle = 1 - Math.min(1, turbulence * 1.35);

    // --- title copy ---
    const isTitle = cur.id === 'title';
    const titleLocal = this.shots.localOf(this.shots.shots[0], P);
    const titleOut = Math.max(0, 1 - titleLocal / 0.45);
    setStyle(this.titleCopy, 'opacity', (isTitle ? titleOut * settle : 0).toFixed(3));

    // --- hud ---
    setStyle(this.hud, 'opacity', (isTitle ? Math.min(1, titleLocal / 0.25) : settle).toFixed(3));
    setText(this.act, cur.data
      ? `0${cur.data.index} / 0${6}  ·  ${cur.data.category}`
      : cur.label);

    // --- project caption ---
    if (cur.data) {
      this.fill(cur);
      const local = this.shots.localOf(cur, P);
      const inK = Math.min(1, local / 0.10);
      const outK = 1 - Math.max(0, (local - 0.88) / 0.12);
      const o = inK * outK * settle;
      setStyle(this.caption, 'opacity', o.toFixed(3));
      setStyle(this.caption, 'transform', `translateY(${((1 - o) * 22).toFixed(2)}px)`);
      this.caption.classList.toggle('live', o > 0.5);
    } else {
      setStyle(this.caption, 'opacity', '0');
      this.caption.classList.remove('live');
    }

    // --- contact ---
    const isContact = cur.id === 'contact';
    const cLocal = isContact ? this.shots.localOf(cur, P) : 0;
    const cOp = isContact ? Math.min(1, cLocal / 0.3) * settle : 0;
    setStyle(this.contact, 'opacity', cOp.toFixed(3));
    this.contact.classList.toggle('live', cOp > 0.6);

    // --- rail ---
    setStyle(this.railFill, 'transform', `scaleY(${P.toFixed(4)})`);
    setText(this.railLabel, cur.label);
    if (this.stops && this.lastStop !== cur.id) {
      this.lastStop = cur.id;
      for (const [id, el] of this.stops) el.classList.toggle('live', id === cur.id);
    }
  }
}
