import * as THREE from 'three';
import { Shot } from '../core/ShotSystem.js';
import { textPlane, TIGHT_HALO } from '../core/Text.js';
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

/* THE STATEMENT.

   Two-line blocks, not single long lines. A 20-character line is ~11:1; at any
   distance where it fills the frame vertically it is already several frame-widths
   wide and crops to nonsense at the exact moment it is meant to be read.

   Each beat now carries a supporting line as well as a headline. Four shouted
   fragments told a visitor almost nothing — the headline says what it is and the
   sub says what that actually means, which is the difference between a slogan and
   a claim someone can evaluate. The last beat hands off to the work. */
const BEATS = [
  {
    head: ['I BUILD'],
    sub: null,
    z: -70, h: 6.2,
  },
  {
    head: ['AI AGENTS', 'THAT SHIP'],
    sub: 'autonomous loops that run in production, not in a demo',
    z: -122, h: 7.4,
  },
  {
    head: ['SYSTEMS,', 'END TO END'],
    sub: 'data model, backend, interface — one hand, one through-line',
    z: -174, h: 7.4,
  },
  {
    head: ['MODELS THAT', 'DECIDE'],
    sub: 'machine learning that makes the call, not just the chart',
    z: -226, h: 7.4,
  },
  {
    head: ['SIX OF THEM', 'ARE BELOW'],
    sub: 'each one built as its own world — keep scrolling',
    z: -278, h: 7.4,
  },
];

/* Beats are spaced 52, not 68.

   The readable window is bounded at both ends: a beat cannot resolve much before
   ~80 units out or it is too small, and it must be gone by ~32 or it crops. That
   is a 48-unit window. Spacing them 68 apart therefore left a 20-unit hole between
   every pair where NEITHER beat was legible — measured mid-shot with the two
   nearest beats at 0.08 and 0.13 opacity, i.e. an empty frame. Spacing under the
   window width guarantees something is always readable. */
const CAM_Z0 = 20;

/* And the camera stops 45 short of the LAST beat rather than overshooting it.
   At the old -284 the closing line sat at opacity 0.04 when the act ended — the
   hand-off into the work simply never appeared. */
const CAM_Z1 = -233;

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
        // At the stack default it haloes into a full-frame haze — and even at 0.5
        // the headlines carried a glow wider than the letters were tall.
        bloom: 0.34,
      },
    });
  }

  build() {
    const S = this.scene;

    this.camera.fov = 34;
    this.camera.near = 0.5;
    this.camera.far = 900;
    this.camera.updateProjectionMatrix();

    /* ---- the corridor ----

       Was a stack of 46 concentric ellipses. Flown down the middle they stack into
       a bullseye — a target, or a 90s tunnel screensaver — and it was the single
       thing making this act look amateur. Worse, it fought the type: a set of
       rings converging on frame centre is exactly where the words sit.

       A wide rectangular duct instead. Four long rails and sparse cross-ties: it
       reads architectural rather than hypnotic, it is FLAT and WIDE so the frame
       stays cinematic, and it leaves the middle of the frame empty for the
       statement. Same grammar the CONTACT terminus ends on, which is what ties
       the two ends of the film together. */
    const DUCT_X = 17;
    const DUCT_Y = 6.4;
    const corner = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

    const railPts = [];
    for (const [sx, sy] of corner) {
      railPts.push(
        new THREE.Vector3(sx * DUCT_X, sy * DUCT_Y, 26),
        new THREE.Vector3(sx * DUCT_X, sy * DUCT_Y, -460),
      );
    }
    const rg = new THREE.BufferGeometry().setFromPoints(railPts);
    S.add(new THREE.LineSegments(rg, new THREE.LineBasicMaterial({
      color: 0x3f86c4, transparent: true, opacity: 0.30,
      depthWrite: false, blending: THREE.AdditiveBlending,
    })));

    // cross-ties, recycled behind the lens so the duct never runs out
    this.ribs = new THREE.Group();
    const RIB_N = 26;
    this.ribGap = 22;
    for (let i = 0; i < RIB_N; i++) {
      const pts = [];
      for (let j = 0; j < 4; j++) {
        const [ax, ay] = corner[j];
        const [bx, by] = corner[(j + 1) % 4];
        pts.push(
          new THREE.Vector3(ax * DUCT_X, ay * DUCT_Y, 0),
          new THREE.Vector3(bx * DUCT_X, by * DUCT_Y, 0),
        );
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.LineSegments(g, new THREE.LineBasicMaterial({
        color: 0x2f6ea8, transparent: true, opacity: 0.4,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      line.position.z = 22 - i * this.ribGap;
      this.ribs.add(line);
    }
    S.add(this.ribs);

    /* ---- speed streaks: real stretched geometry, not sprites ---- */
    // Kept sparse. At the old count the chromatic aberration in the stack picked
    // out every streak as a red/green diagonal and the frame read as compression
    // artefacts rather than motion.
    const N = 150;
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
      color: 0x9fd0ff, transparent: true, opacity: 0.15,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    S.add(this.streaks);

    /* ---- the statement ----

       Syncopate 700 at glow 0.55 with the default halo is what produced fat, soft
       letters with their counters filled in — the "blobby glowing text" that made
       the act look like a game menu. Three things fix it: a grotesque built for
       weight rather than a wide display face, the tight halo, and a glow low
       enough that only the stems carry light. Type should look like type first
       and like a light source second. */
    this.words = BEATS.map((B) => {
      const head = textPlane(null, {
        paragraph: B.head,
        height: B.h,
        font: '"Space Grotesk", system-ui, sans-serif',
        weight: 700,
        size: 108,
        tracking: -0.005,
        leading: 1.08,
        align: 'center',
        color: 0x8fc9ff,
        hot: 0xeaf6ff,
        halo: TIGHT_HALO,
        glow: 0.22,
        wipeWidth: 0.06,
      });
      head.position.set(0, 0.55, B.z);
      head.userData.spec = B;
      head.setOpacity(0);
      S.add(head);

      let sub = null;
      if (B.sub) {
        sub = textPlane(null, {
          paragraph: [B.sub],
          height: B.h * 0.20,
          font: '"Space Grotesk", system-ui, sans-serif',
          weight: 400,
          size: 46,
          tracking: 0.02,
          align: 'center',
          color: 0x5f8fc4,
          hot: 0x9fc8ea,
          halo: TIGHT_HALO,
          glow: 0.10,
        });
        // hangs off the headline's measured height, so the pair stays a unit
        sub.position.set(0, 0.55 - B.h * 0.62, B.z);
        sub.setOpacity(0);
        S.add(sub);
      }

      return { head, sub, spec: B };
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

    // ties recycle behind the camera so the duct never runs out
    const span = this.ribs.children.length * this.ribGap;
    for (const rib of this.ribs.children) {
      let rz = rib.position.z;
      if (rz > z + 26) rz -= span;
      rib.position.z = rz;
      const ahead = z - rz;
      // fade the far ties out early: converging lines pile up at the vanishing
      // point, which is exactly where the supporting line has to stay readable
      rib.material.opacity = 0.44 * ramp(ahead, 230, 55) * lramp(ahead, -6, 12);
    }

    // streaks stream past the lens
    this.streaks.position.z = (this.streaks.position.z + dt * 26) % 60;

    for (const w of this.words) {
      const ahead = z - w.spec.z;              // >0 while the beat is still in front

      /* The beat has to be GONE before the lens reaches it.

         The camera used to fly straight through each headline, which sounds good
         and looks terrible: the block is frame-filling by ~7 units out, so for the
         last stretch of its life it is a pair of gigantic cropped letters. And
         because the type is additively blended, at that size you read the corridor
         and the NEXT headline straight through it. Measured at the pass-through
         the frame was two half-letters with "MODELS DECI" legible inside them.

         So it resolves far out, holds at a readable ~25% of frame height, and
         dissolves while it is still comfortably inside the frame. The sense of
         flight comes from the duct and the streaks; the type does not need to be
         driven over to feel fast, it needs to be readable. */
      /* Beats sit 68 apart, so the visible window has to be WIDER than 68 or the
         frame goes empty between them — at the first attempt at this the gaps
         measured 0.002 lit, i.e. black. Resolving from 132 gives a window of ~117
         against the 68 spacing, so the next beat is already legible by the time
         the current one starts to go. */
      const inK = ramp(ahead, 120, 80);        // resolves out of the far dark
      const outK = ramp(ahead, 16, 32);        // and clears before it crops

      // Depth hierarchy. Beats are spaced closer than their visible range, so two
      // are on screen at once by design — but they must not compete. The one being
      // read sits at full strength and the one behind it is a ghost, which reads as
      // distance rather than as two headlines fighting.
      // floor kept low: the type is additive, so anything still lit behind the
      // current beat is read THROUGH its letters
      const near = 0.10 + 0.90 * ramp(ahead, 92, 54);
      const o = inK * outK * near;
      w.head.setOpacity(o);

      /* Ignite in reading order, and FINISH while the block is still comfortably
         inside the frame. The old window closed at 38 units, by which point a
         block already fills the frame — so the reveal was still running while the
         words were being cropped, and a frame grabbed mid-wipe read as a bug
         ("FULL-S / SYSTI") rather than as a reveal. */
      const wipe = lramp(ahead, 112, 78);
      w.head.setWipe(wipe >= 1 ? -1 : wipe);

      // the supporting line lands after its headline has resolved, never with it
      if (w.sub) w.sub.setOpacity(o * ramp(ahead, 86, 62) * 0.95);

      // parallax against the corridor
      w.head.position.x = input.px * 0.7;
      w.head.position.y = 0.55 + input.py * 0.45;
      if (w.sub) {
        w.sub.position.x = input.px * 0.7;
        w.sub.position.y = 0.55 - w.spec.h * 0.62 + input.py * 0.45;
      }
    }
  }
}
