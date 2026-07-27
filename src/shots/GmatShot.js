import * as THREE from 'three';
import { Shot } from '../core/ShotSystem.js';
import { PROJECTS } from '../data/projects.js';
import { textPlane } from '../core/Text.js';
import { input } from '../core/Input.js';
import { ramp, lramp, hash } from '../core/math.js';

/* ACT II / 06 — GMAT VERBAL ENGINE.  SHOTLIST.md §5.

   Text as architecture. The passage is not displayed, it is BUILT: dense body copy
   forms two walls, and the camera tracks down the gap between them. The reasoning
   beats stand in the middle of the corridor at reading height, so moving forward
   through the passage and moving forward through the argument are the same motion.

   The last beat is the conclusion, and the walls dim as it lands — the argument
   resolving is staged as a lighting change, not as a caption. */

const DATA = PROJECTS.find((p) => p.id === 'gmat');

/* Real critical-reasoning cadence — the wall has to survive being read. */
const PASSAGE = [
  ['Municipal transit authorities have argued', 'that extending the night bus network', 'would reduce private car use downtown.'],
  ['In the two years since the extension,', 'measured car traffic downtown fell', 'by eleven percent on weeknights.'],
  ['Officials cite this decline as evidence', 'that the extension achieved its aim', 'and should be funded permanently.'],
  ['Over the same period, however, three', 'large employers relocated their offices', 'out of the downtown core entirely.'],
  ['Each of those employers had accounted', 'for a substantial share of the', 'weeknight commuter volume.'],
  ['The argument therefore depends on an', 'assumption it never states: that the', 'decline has a single cause.'],
  ['Which of the following, if true, most', 'seriously weakens the conclusion drawn', 'by the transit authorities?'],
  ['A claim survives only when the', 'alternative explanations for its', 'evidence have been ruled out.'],
];

const BEATS = [
  { text: 'PREMISE', z: -46, y: 1.2 },
  { text: 'EVIDENCE', z: -104, y: -0.8 },
  { text: 'THE GAP', z: -162, y: 1.0 },
  { text: '∴ CONCLUSION', z: -228, y: -0.4, final: true },
];

const WALL_X = 15.5;
const PANEL_GAP = 27;
const PANELS_PER_SIDE = 12;

/* The camera stops SHORT of the conclusion. It resolves at ~92% and then holds,
   filling the frame as the gas takes the shot — so the act ends on the answer
   rather than on the empty corridor behind it. At the original travel the lens
   overran the last panel and the shot played out to 0.9% frame coverage. */
const CAM_Z0 = 22;
const CAM_Z1 = -212;

export class GmatShot extends Shot {
  constructor() {
    super({
      id: DATA.id,
      label: DATA.name,
      scrollVh: 150,
      edgeColor: 0x7ae8ff,
      // like THESIS, this shot's subject is large areas of near-white type, which
      // the stack's default bloom turns into a haze
      grade: { ...DATA.grade, bloom: 0.5 },
    });
    this.data = DATA;
  }

  build() {
    const S = this.scene;

    this.camera.fov = 33;
    this.camera.near = 0.5;
    this.camera.far = 900;
    this.camera.updateProjectionMatrix();

    /* ---- the walls ---- */
    this.panels = [];
    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? -1 : 1;
      for (let i = 0; i < PANELS_PER_SIDE; i++) {
        const lines = PASSAGE[(i + side * 3) % PASSAGE.length];
        const m = textPlane(null, {
          paragraph: lines,
          height: 6.2,
          font: '"Space Grotesk", system-ui, sans-serif',
          weight: 400,
          size: 40,
          leading: 1.62,
          align: 'left',
          color: 0x2f8fb8,
          hot: 0xa8ecff,
          glow: 0.30,
        });
        m.position.set(sign * WALL_X, 0.4 + (hash(i + side * 20) - 0.5) * 2.4, -18 - i * PANEL_GAP);
        m.rotation.y = -sign * Math.PI / 2;   // turn to face the corridor
        m.setOpacity(0);
        m.userData.side = sign;
        S.add(m);
        this.panels.push(m);
      }
    }

    /* ---- the reasoning beats, standing in the corridor ---- */
    this.beats = BEATS.map((b) => {
      const m = textPlane(b.text, {
        height: b.final ? 3.0 : 2.3,
        font: 'Syncopate, "Arial Black", sans-serif',
        weight: 700,
        size: 96,
        tracking: 0.10,
        color: b.final ? 0x6cd8f0 : 0x3d9ec2,
        hot: 0xd9f6ff,
        glow: b.final ? 0.5 : 0.28,
        wipeWidth: 0.05,
      });
      m.position.set(0, b.y, b.z);
      m.userData.spec = b;
      m.setOpacity(0);
      S.add(m);
      return m;
    });

    /* ---- floor + ceiling rules: the architecture the text hangs on ---- */
    const rule = (y) => {
      const pts = [];
      for (const s of [-1, 1]) {
        pts.push(
          new THREE.Vector3(s * WALL_X, y, 30),
          new THREE.Vector3(s * WALL_X, y, -320),
        );
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      return new THREE.LineSegments(g, new THREE.LineBasicMaterial({
        color: 0x2c7fa4, transparent: true, opacity: 0.4,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }));
    };
    S.add(rule(-5.2), rule(5.2));

    /* ---- cross-ties every panel, so the corridor has structure ---- */
    const tie = [];
    for (let i = 0; i < 14; i++) {
      const z = 10 - i * PANEL_GAP;
      for (const s of [-1, 1]) {
        tie.push(new THREE.Vector3(s * WALL_X, -5.2, z), new THREE.Vector3(s * WALL_X, 5.2, z));
      }
    }
    const tg = new THREE.BufferGeometry().setFromPoints(tie);
    S.add(new THREE.LineSegments(tg, new THREE.LineBasicMaterial({
      color: 0x1f5f7e, transparent: true, opacity: 0.3,
      depthWrite: false, blending: THREE.AdditiveBlending,
    })));

    /* ---- fine particulate in the volume ---- */
    const N = 1100;
    const pp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pp.set([
        (hash(i * 3 + 1) - 0.5) * WALL_X * 2,
        (hash(i * 3 + 2) - 0.5) * 10,
        20 - hash(i * 3 + 3) * 320,
      ], i * 3);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    this.motes = new THREE.Points(pg, new THREE.PointsMaterial({
      color: 0x8fd8ee, size: 0.055, transparent: true, opacity: 0.45,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    S.add(this.motes);
  }

  update(dt, t, localP) {
    const z = CAM_Z0 + (CAM_Z1 - CAM_Z0) * localP;

    this.camera.position.set(
      Math.sin(t * 0.21) * 0.5 + input.px * 2.6,
      Math.cos(t * 0.17) * 0.28 + input.py * 1.4,
      z,
    );
    this.camera.lookAt(
      Math.sin(t * 0.12) * 0.9 + input.px * 1.2,
      Math.cos(t * 0.09) * 0.4 + input.py * 0.7,
      z - 40,
    );
    this.camera.rotation.z = Math.sin(t * 0.14) * 0.006;

    /* The conclusion landing dims the passage around it — the argument resolving,
       staged as light. Ramps up over the last beat's approach. */
    const finalBeat = this.beats[this.beats.length - 1];
    const finalAhead = z - finalBeat.position.z;
    const resolve = ramp(finalAhead, 62, 16);

    for (const p of this.panels) {
      const ahead = z - p.position.z;
      const vis = ramp(ahead, 178, 132) * ramp(ahead, -8, 8);
      p.setOpacity(vis * (0.80 - resolve * 0.58));
    }

    for (const m of this.beats) {
      const b = m.userData.spec;
      const ahead = z - m.position.z;
      const inK = ramp(ahead, 88, 62);
      const outK = ramp(ahead, -6, 8);
      const near = 0.3 + 0.7 * ramp(ahead, 62, 26);
      m.setOpacity(inK * outK * near * (b.final ? 1.25 : 1));
      const wipe = lramp(ahead, 60, 34);
      m.setWipe(wipe >= 1 ? -1 : wipe);
    }

    this.motes.rotation.z = t * 0.004;
  }
}
