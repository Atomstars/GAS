import * as THREE from 'three';
import { NEUTRAL_GRADE } from './Grade.js';

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

export class ShotSystem {
  constructor() {
    this.shots = [];
    this.totalVh = 0;
    this.active = null;
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

  localOf(shot, P) {
    const d = shot.end - shot.start;
    return d <= 0 ? 0 : THREE.MathUtils.clamp((P - shot.start) / d, 0, 1);
  }

  update(P, dt, t) {
    const r = this.resolve(P);

    // build lazily, but build the incoming shot before it is ever shown
    r.from.ensureBuilt();
    if (r.to) r.to.ensureBuilt();

    r.from.update(dt, t, this.localOf(r.from, P));
    if (r.to) r.to.update(dt, t, this.localOf(r.to, P));

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
