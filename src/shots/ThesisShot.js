import * as THREE from 'three';
import { Shot } from '../core/ShotSystem.js';
import { textPlane } from '../core/Text.js';
import { input } from '../core/Input.js';
import { ramp, lramp } from '../core/math.js';

/* ACT I — THESIS.  SHOTLIST.md §3.

   The claim, stated once, at speed. The camera does not look at the statement —
   it flies THROUGH it, and each line ignites in reading order as it arrives, so
   the type is read by the camera move rather than by a fade.

   This shot also establishes the visual grammar the rest of the film runs on:
   a lit corridor receding to a vanishing point. Every project world after this
   is a stop along that same line, which is what makes the six of them read as
   one route instead of six unrelated set pieces. */

/* Set as two-line blocks, not single long lines. A 20-character line is ~11:1;
   at any distance where it fills the frame vertically it is already several
   frame-widths wide and crops to nonsense at the exact moment it is meant to be
   read. Stacked, each block is ~3:1 and can be large AND legible in the same
   frame. Measured: the single-line set peaked at ndcX 1.54 — half of it off
   screen — at the point where its reveal completed. */
const LINES = [
  { lines: ['I BUILD'],                 z: -32,  h: 6.0, x: -1.6, y: 0.7 },
  { lines: ['AI', 'AGENTS'],            z: -84,  h: 7.4, x: 2.6,  y: -0.9 },
  { lines: ['FULL-STACK', 'SYSTEMS'],   z: -136, h: 6.6, x: -2.4, y: 1.2 },
  { lines: ['INTERFACES', 'THAT MOVE'], z: -188, h: 7.0, x: 1.4,  y: -0.6 },
];

const CAM_Z0 = 18;
const CAM_Z1 = -212;

/** Where the camera sits at a given point in the shot. */
const camZ = (p) => CAM_Z0 + (CAM_Z1 - CAM_Z0) * p;

export class ThesisShot extends Shot {
  constructor() {
    super({
      id: 'thesis',
      label: 'WHAT I BUILD',
      scrollVh: 120,
      edgeColor: 0xbfe4ff,
      grade: {
        lift: [-0.010, -0.005, 0.012],
        gamma: [1.03, 1.0, 0.96],
        gain: [0.95, 1.0, 1.10],
        sat: 0.88,
        contrast: 1.20,
        // low, because this shot's subject is large areas of near-white type.
        // At the stack default it haloes into a full-frame haze.
        bloom: 0.5,
      },
    });
  }

  build() {
    const S = this.scene;

    this.camera.fov = 34;
    this.camera.near = 0.5;
    this.camera.far = 900;
    this.camera.updateProjectionMatrix();

    /* ---- the corridor: ribs + rails receding to the vanishing point ---- */
    this.ribs = new THREE.Group();
    const RIB_N = 46;
    const RIB_GAP = 9;
    for (let i = 0; i < RIB_N; i++) {
      const z = 20 - i * RIB_GAP;
      const r = 13 + Math.sin(i * 0.7) * 0.9;
      const SEG = 64;
      const pos = new Float32Array(SEG * 3);
      for (let j = 0; j < SEG; j++) {
        const a = (j / SEG) * Math.PI * 2;
        pos.set([Math.cos(a) * r, Math.sin(a) * r * 0.62, 0], j * 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const line = new THREE.LineLoop(g, new THREE.LineBasicMaterial({
        color: 0x2f6ea8,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      line.position.z = z;
      line.userData.baseZ = z;
      this.ribs.add(line);
    }
    S.add(this.ribs);

    // long rails tie the ribs together so the corridor reads as one object
    const railPts = [];
    for (const ang of [0.32, Math.PI - 0.32, Math.PI + 0.32, -0.32]) {
      const r = 13.2;
      railPts.push(
        new THREE.Vector3(Math.cos(ang) * r, Math.sin(ang) * r * 0.62, 24),
        new THREE.Vector3(Math.cos(ang) * r, Math.sin(ang) * r * 0.62, -400),
      );
    }
    const rg = new THREE.BufferGeometry().setFromPoints(railPts);
    S.add(new THREE.LineSegments(rg, new THREE.LineBasicMaterial({
      color: 0x3f86c4, transparent: true, opacity: 0.34,
      depthWrite: false, blending: THREE.AdditiveBlending,
    })));

    /* ---- speed streaks: real stretched geometry, not sprites ---- */
    const N = 320;
    const sp = new Float32Array(N * 6);
    this.streakSeed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 3 + Math.random() * 11;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r * 0.62;
      const z = 20 - Math.random() * 420;
      const len = 2 + Math.random() * 6;
      sp.set([x, y, z, x, y, z - len], i * 6);
      this.streakSeed[i] = len;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.streaks = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({
      color: 0x9fd0ff, transparent: true, opacity: 0.34,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    S.add(this.streaks);

    /* ---- the statement ---- */
    this.words = LINES.map((L) => {
      const m = textPlane(null, {
        paragraph: L.lines,
        height: L.h,
        font: 'Syncopate, "Arial Black", sans-serif',
        weight: 700,
        size: 110,
        tracking: 0.07,
        leading: 1.2,
        align: 'center',
        color: 0x5ea8f5,
        hot: 0xd7ecff,
        glow: 0.55,
        wipeWidth: 0.05,
      });
      m.position.set(L.x, L.y, L.z);
      m.userData.spec = L;
      m.setOpacity(0);
      S.add(m);
      return m;
    });
  }

  update(dt, t, localP) {
    const z = camZ(localP);

    // handheld: two decorrelated frequencies so it never reads as a sine
    const hx = Math.sin(t * 0.31) * 0.24 + Math.sin(t * 0.77) * 0.09;
    const hy = Math.cos(t * 0.27) * 0.18 + Math.cos(t * 0.63) * 0.07;

    this.camera.position.set(
      hx + input.px * 1.5,
      hy + input.py * 1.0,
      z,
    );
    // aim slightly off-axis so the corridor's vanishing point drifts rather than
    // sitting nailed to frame centre
    this.camera.lookAt(
      Math.sin(t * 0.13) * 0.7 + input.px * 0.8,
      Math.cos(t * 0.11) * 0.5 + input.py * 0.5,
      z - 40,
    );
    this.camera.rotation.z = Math.sin(t * 0.19) * 0.006;

    // ribs recycle behind the camera so the corridor never runs out
    for (const rib of this.ribs.children) {
      let rz = rib.position.z;
      if (rz > z + 26) rz -= 46 * 9;
      rib.position.z = rz;
      const ahead = z - rz;
      // fade with depth, and fade back out as a rib passes the lens
      rib.material.opacity = 0.62 * ramp(ahead, 340, 60) * lramp(ahead, -6, 10);
    }

    // streaks stream past the lens
    this.streaks.position.z = (this.streaks.position.z + dt * 26) % 60;

    for (const w of this.words) {
      const ahead = z - w.position.z;          // >0 while the line is still in front

      const inK = ramp(ahead, 92, 66);         // resolves out of the far dark
      const outK = ramp(ahead, -4, 10);        // and blows past the lens

      // Depth hierarchy. The lines are spaced closer than their visible range, so
      // two are on screen at once by design — but they must not compete. The line
      // being read sits at full strength and the one behind it is a ghost, which
      // reads as distance instead of as two headlines fighting.
      const near = 0.22 + 0.78 * ramp(ahead, 66, 30);
      w.setOpacity(inK * outK * near);

      // Ignite in reading order on approach and finish while the block is still
      // fully inside the frame — a reveal that completes after it has started
      // cropping is a reveal nobody can read.
      const wipe = lramp(ahead, 64, 38);
      w.setWipe(wipe >= 1 ? -1 : wipe);

      // parallax the lines against the corridor
      const s = w.userData.spec;
      w.position.x = s.x + input.px * 0.9;
      w.position.y = s.y + input.py * 0.6;
    }
  }
}
