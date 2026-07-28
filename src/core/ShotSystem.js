import * as THREE from 'three';
import { NEUTRAL_GRADE } from './Grade.js';
import { motion } from './motion.js';

/* A shot owns its own scene, camera, lighting and grade. That is the whole point:
   the old build had ONE scene and ONE camera lerping through it forever, which is
   why it read as a ride rather than a film. Here every frame is a real cut. */

export class Shot {
  /**
   * @param {object} o
   * @param {string} o.id
   * @param {string} o.label      caption shown on the progress rail
   * @param {number} o.scrollVh   how much scroll this shot owns (see SHOTLIST.md §3)
   * @param {object} o.grade      per-shot colour grade
   * @param {number} o.edgeColor  colour the gas burns when transitioning OUT of this shot
   */
  constructor({ id, label, scrollVh = 100, grade = NEUTRAL_GRADE, edgeColor = 0x9fd8ff }) {
    this.id = id;
    this.label = label;
    this.scrollVh = scrollVh;
    this.grade = grade;
    this.edgeColor = edgeColor;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 4000);

    this.start = 0;
    this.end = 1;
    this.built = false;
  }

  build() {}
  /** @param {number} localP 0..1 within this shot */
  update(_dt, _t, _localP) {}
  onEnter() {}
  onExit() {}

  setSize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  ensureBuilt() {
    if (!this.built) { this.build(); this.built = true; }
  }
}

/* Width of the gas transition band, in global journey progress. */
const BAND = 0.05;

/* The floor on how long a gas transition may take, in seconds.

   The band is a fixed slice of SCROLL (0.05 of the journey, ~390px at 720p), so
   at reading pace it lasts 1.5-3s and this never applies. But a hard wheel flick
   covers 390px in three frames, and measured live the mix jumped 0.8 in a single
   frame — the atomize/churn/recondense that the whole brand rests on degraded to
   a flicker at exactly the moment the viewer was moving fastest. So the mix is
   scroll-DRIVEN but rate-LIMITED: below this speed nothing changes, above it the
   gas keeps its screen time and the scroll catches up on the far side. */
const MIN_GAS_SECONDS = 0.55;

export class ShotSystem {
  constructor() {
    this.shots = [];
    this.totalVh = 0;
    this.active = null;

    this._latch = -1;      // index of the boundary currently burning, -1 for none
    this._mix = 0;         // the paced mix actually shown
    this._forward = true;  // direction the burn in flight is travelling
    this._cooling = false; // a burn just finished; don't start another mid-band
    this._prevP = null;
  }

  add(shot) { this.shots.push(shot); return shot; }

  layout() {
    this.totalVh = this.shots.reduce((s, x) => s + x.scrollVh, 0);
    let acc = 0;
    for (const s of this.shots) {
      s.start = acc / this.totalVh;
      acc += s.scrollVh;
      s.end = acc / this.totalVh;
    }
  }

  /** Which shot(s) are on screen at global progress P, and the transition mix. */
  resolve(P) {
    const n = this.shots.length;
    for (let i = 0; i < n - 1; i++) {
      const b = this.shots[i].end;
      if (P > b - BAND / 2 && P < b + BAND / 2) {
        const mix = (P - (b - BAND / 2)) / BAND;
        return { from: this.shots[i], to: this.shots[i + 1], mix };
      }
    }
    for (let i = 0; i < n; i++) {
      const s = this.shots[i];
      if (P <= s.end || i === n - 1) return { from: s, to: null, mix: null };
    }
    return { from: this.shots[0], to: null, mix: null };
  }

  /** Index of the shot containing P, ignoring transition bands. */
  idxOf(P) {
    const n = this.shots.length;
    for (let i = 0; i < n; i++) if (P <= this.shots[i].end) return i;
    return n - 1;
  }

  /* Rate-limited view of `resolve`. Same shape out, but the mix may only move so
     fast — see MIN_GAS_SECONDS.

     Crucially this stays ONE burn no matter how far the flick went. The world we
     left is pinned as `from`; only the destination is retargeted, to whichever
     world the scroll has since landed on. Chaining a queue of transitions instead
     would play burns the viewer had already scrolled past, and re-latching `from`
     mid-burn pops the outgoing image — measured as a 0.87 jump in the dissolve
     threshold in a single frame, which reads as a hard cut. Retargeting `to` is
     safe because `to` is faint while the mix is low, which is exactly when it
     changes. */
  pace(raw, P, dt, forward) {
    const last = this.shots.length - 1;

    if (this._latch < 0) {
      if (raw.mix === null) { this._cooling = false; return raw; }
      // One flick, one burn. Without this the burn completes, the scroll is still
      // mid-band somewhere further on, and a second burn starts from a standing
      // start partway through its dissolve — measured as a 0.62 jump. The first
      // burn already delivered us to where the scroll landed; there is nothing
      // left to transition.
      if (this._cooling) return { from: this.shots[this.idxOf(P)], to: null, mix: null };
      this._latch = this.shots.indexOf(raw.from);
      this._forward = forward;
      this._mix = forward ? 0 : 1;                    // always a whole transition
    }

    const i = this._latch;
    const edge = this.shots[i].end - BAND / 2;
    const target = THREE.MathUtils.clamp((P - edge) / BAND, 0, 1);

    const step = dt / MIN_GAS_SECONDS;
    this._mix += THREE.MathUtils.clamp(target - this._mix, -step, step);

    // The side we came from is pinned; the side we are heading for tracks the
    // scroll, so however far the flick went the gas recondenses into where it
    // actually landed.
    const here = this.idxOf(P);
    const a = this._forward ? i : Math.max(0, Math.min(i, here));
    const b = this._forward ? Math.min(last, Math.max(i + 1, here)) : i + 1;

    if (target >= 1 && this._mix > 1 - 1e-3) {
      this._latch = -1; this._cooling = true;
      return { from: this.shots[b], to: null, mix: null };
    }
    if (target <= 0 && this._mix < 1e-3) {
      this._latch = -1; this._cooling = true;
      return { from: this.shots[a], to: null, mix: null };
    }
    return { from: this.shots[a], to: this.shots[b], mix: this._mix };
  }

  localOf(shot, P) {
    const d = shot.end - shot.start;
    return d <= 0 ? 0 : THREE.MathUtils.clamp((P - shot.start) / d, 0, 1);
  }

  update(P, dt, t) {
    const forward = P >= (this._prevP ?? P);
    this._prevP = P;
    const r = this.pace(this.resolve(P), P, dt, forward);

    // build lazily, but build the incoming shot before it is ever shown
    r.from.ensureBuilt();
    if (r.to) r.to.ensureBuilt();

    /* Shots are handed a scaled clock, never the real one. Every idle drift in the
       film is written against this `t`, so this single line is what makes
       prefers-reduced-motion reach all nine of them — while `dt` above, which
       paces the gas cut, stays on real time. Scaling `t` rather than accumulating
       a separate clock keeps the dev harness deterministic. */
    const st = t * motion.timeScale;
    const sdt = dt * motion.timeScale;
    r.from.update(sdt, st, this.localOf(r.from, P));
    if (r.to) r.to.update(sdt, st, this.localOf(r.to, P));

    const nowActive = r.mix === null ? r.from : (r.mix < 0.5 ? r.from : r.to);
    if (nowActive !== this.active) {
      this.active?.onExit();
      this.active = nowActive;
      this.active.onEnter();
    }
    return r;
  }

  setSize(w, h) { for (const s of this.shots) s.setSize(w, h); }
}
