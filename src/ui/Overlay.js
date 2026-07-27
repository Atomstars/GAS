import { repoUrl } from '../data/projects.js';

/* The DOM layer. It is deliberately thin: telemetry lives in the 3D scene, and
   this carries only what type does better than geometry — the name, the claim,
   and the one link. Everything here is driven by shot state, never by clicks. */

const $ = (s) => document.querySelector(s);

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

    this.shown = null;
    this.buildRail();
  }

  buildRail() {
    const rail = $('#rail-ticks');
    if (!rail) return;
    for (const s of this.shots.shots) {
      const tick = document.createElement('i');
      tick.style.top = `${s.start * 100}%`;
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
    const cur = r.mix === null ? r.from : (r.mix < 0.5 ? r.from : r.to);

    // during a gas transition the type blows away with everything else
    const settle = 1 - Math.min(1, turbulence * 1.35);

    // --- title copy ---
    const isTitle = cur.id === 'title';
    const titleLocal = this.shots.localOf(this.shots.shots[0], P);
    const titleOut = Math.max(0, 1 - titleLocal / 0.45);
    this.titleCopy.style.opacity = String(isTitle ? titleOut * settle : 0);

    // --- hud ---
    this.hud.style.opacity = String(isTitle ? Math.min(1, titleLocal / 0.25) : settle);
    this.act.textContent = cur.data
      ? `0${cur.data.index} / 0${6}  ·  ${cur.data.category}`
      : cur.label;

    // --- project caption ---
    if (cur.data) {
      this.fill(cur);
      const local = this.shots.localOf(cur, P);
      const inK = Math.min(1, local / 0.10);
      const outK = 1 - Math.max(0, (local - 0.88) / 0.12);
      const o = inK * outK * settle;
      this.caption.style.opacity = String(o);
      this.caption.style.transform = `translateY(${(1 - o) * 22}px)`;
      this.caption.classList.toggle('live', o > 0.5);
    } else {
      this.caption.style.opacity = '0';
      this.caption.classList.remove('live');
    }

    // --- contact ---
    const isContact = cur.id === 'contact';
    const cLocal = isContact ? this.shots.localOf(cur, P) : 0;
    const cOp = isContact ? Math.min(1, cLocal / 0.3) * settle : 0;
    this.contact.style.opacity = String(cOp);
    this.contact.classList.toggle('live', cOp > 0.6);

    // --- rail ---
    this.railFill.style.transform = `scaleY(${P})`;
    this.railLabel.textContent = cur.label;
  }
}
