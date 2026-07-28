import * as THREE from 'three';
import { Shot } from '../core/ShotSystem.js';
import { textPlane, TIGHT_HALO } from '../core/Text.js';
import { input } from '../core/Input.js';
import { CATEGORIES, projectsIn } from '../data/projects.js';
import { ramp, lramp, hash } from '../core/math.js';

/* ACT I½ — THE GATE.

   The junction. THESIS ends by saying the work is below; this is where the route
   forks before it gets there, and it exists because a straight line of projects
   does not survive contact with a twentieth project.

   Four rooms stand in the chamber as portals — real frames in space, in the same
   rectangular language as the THESIS duct and the CONTACT terminus, so the film
   still reads as one continuous piece of architecture. Each portal carries its
   category, a one-line claim, and the projects inside it listed line by line.

   Scroll on and the camera flies straight through the middle of the chamber and
   into the work, exactly as before — nothing is gated in the sense of blocked.
   The portals are simply also targets: the DOM layer projects an anchor onto each
   one, and clicking it flies you to that room's first project. The cinematic
   default is untouched; the shortcut is additive. */

const CAM_Z0 = 26;
/* Stops 45 short of the LAST portal instead of flying past it. Overshooting put
   the fourth room at opacity 0 for the final stretch of the shot — the act ended
   on an empty chamber, which is the same fault THESIS had at its closing line. */
const CAM_Z1 = -167;

/* THE ROOMS SPIRAL.

   Four doorways alternating left/right is a corridor, and a corridor is what the
   two shots either side of this one already are — so the gate read as more of the
   same, one thing after another. Winding them onto a helix instead means each room
   arrives at a different clock position: upper left, right, low, upper right. The
   camera counter-rolls slightly as it advances, so the whole chamber turns around
   you and the four rooms are felt as a set rather than a queue.

   The POSITIONS spiral; the doorways themselves stay upright. Rotating the rooms
   with the helix would tilt their type, and everything in this shot exists to be
   read. The ellipse is wide and shallow for the same reason — 16:9 has far more
   room to the sides than above and below.

   x stays modest regardless: screen offset goes as 1/z, so a portal parked far
   off-axis is already outside the frame by the distance at which its type becomes
   readable. The first pass sat them at ±20.5 and each slid off the edge before the
   project list on it could be read. */
const SLOTS = [0, 1, 2, 3].map((i) => {
  const a = -0.42 + i * 1.42;
  return {
    x: Math.cos(a) * 15.5,
    y: Math.sin(a) * 5.2,
    z: -80 - i * 44,
    a,
  };
});

const PORTAL_W = 21;
const PORTAL_H = 15;

/* ---------------------------------------------------------------------------
   ROOM SIGNATURES.

   Four identical doorways with four different labels is a menu. The whole claim
   of this site is that each kind of work is its own domain, so each room has to
   LOOK like the work inside it before a single word is read — the same argument
   that gives every project its own world, applied one level up.

   Each is cheap line and point geometry animated off the shot clock: a graph that
   fires, a line that carries product, a curve that predicts, a device that
   refreshes. They sit in the right third of the doorway, opposite the type.
   --------------------------------------------------------------------------- */

const additive = (color, opacity) => new THREE.LineBasicMaterial({
  color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending,
});

function motifGraph(accent) {
  const g = new THREE.Group();
  const nodes = [
    [0, 2.6], [-2.2, 1.0], [2.2, 1.2], [-1.4, -1.4], [1.6, -1.0], [0, -3.0], [3.0, -2.4],
  ];
  const edges = [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5], [4, 6], [2, 6]];

  const ep = [];
  for (const [a, b] of edges) {
    ep.push(new THREE.Vector3(...nodes[a], 0), new THREE.Vector3(...nodes[b], 0));
  }
  const eMat = additive(accent, 0.3);
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ep), eMat));

  const np = new Float32Array(nodes.length * 3);
  nodes.forEach((n, i) => np.set([n[0], n[1], 0], i * 3));
  const nGeo = new THREE.BufferGeometry();
  nGeo.setAttribute('position', new THREE.BufferAttribute(np, 3));
  const nMat = new THREE.PointsMaterial({
    color: accent, size: 0.34, transparent: true, opacity: 0.85,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  g.add(new THREE.Points(nGeo, nMat));

  // the agent itself, walking the graph
  const tGeo = new THREE.BufferGeometry();
  tGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
  const tMat = new THREE.PointsMaterial({
    color: 0xffffff, size: 0.55, transparent: true, opacity: 1,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  const trav = new THREE.Points(tGeo, tMat);
  g.add(trav);

  return {
    group: g,
    update(t, o) {
      const k = (t * 0.42) % edges.length;
      const i = Math.floor(k);
      const f = k - i;
      const [a, b] = edges[i];
      const p = tGeo.attributes.position;
      p.array[0] = nodes[a][0] + (nodes[b][0] - nodes[a][0]) * f;
      p.array[1] = nodes[a][1] + (nodes[b][1] - nodes[a][1]) * f;
      p.needsUpdate = true;
      eMat.opacity = 0.30 * o;
      nMat.opacity = (0.55 + 0.3 * Math.sin(t * 2.1)) * o;
      tMat.opacity = o;
    },
  };
}

function motifPipeline(accent) {
  const g = new THREE.Group();
  const y0 = 1.4;
  const line = [];
  for (const y of [y0, y0 - 2.8]) {
    line.push(new THREE.Vector3(-3.4, y, 0), new THREE.Vector3(3.4, y, 0));
  }
  const lMat = additive(accent, 0.32);
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(line), lMat));

  // stations
  const st = [];
  for (let i = 0; i < 4; i++) {
    const x = -3.4 + i * 2.27;
    st.push(new THREE.Vector3(x, y0 + 0.5, 0), new THREE.Vector3(x, y0 - 0.5, 0));
    st.push(new THREE.Vector3(x, y0 - 2.3, 0), new THREE.Vector3(x, y0 - 3.3, 0));
  }
  const sMat = additive(accent, 0.5);
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(st), sMat));

  // product moving through, on a fixed cadence
  const N = 10;
  const pp = new Float32Array(N * 3);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0xffffff, size: 0.3, transparent: true, opacity: 0.9,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  g.add(new THREE.Points(pGeo, pMat));

  return {
    group: g,
    update(t, o) {
      const p = pGeo.attributes.position;
      for (let i = 0; i < N; i++) {
        const lane = i % 2;
        const u = ((t * 0.30 + i * 0.21) % 1);
        p.array[i * 3] = -3.4 + u * 6.8;
        p.array[i * 3 + 1] = lane ? y0 - 2.8 : y0;
        p.array[i * 3 + 2] = 0;
      }
      p.needsUpdate = true;
      lMat.opacity = 0.32 * o; sMat.opacity = 0.5 * o; pMat.opacity = 0.9 * o;
    },
  };
}

function motifCurve(accent) {
  const g = new THREE.Group();
  const SEG = 60;
  const pts = [];
  for (let i = 0; i < SEG; i++) {
    const x = -3.4 + (i / (SEG - 1)) * 6.8;
    const y = -2.2 + Math.pow((i / (SEG - 1)), 1.7) * 4.6;
    pts.push(new THREE.Vector3(x, y, 0));
  }
  const cGeo = new THREE.BufferGeometry().setFromPoints(pts);
  const cMat = additive(0xffffff, 0.85);
  const curve = new THREE.Line(cGeo, cMat);
  g.add(curve);

  // the actual, scattered around the prediction
  const N = 34;
  const sp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const x = -3.4 + u * 6.8;
    const y = -2.2 + Math.pow(u, 1.7) * 4.6 + (hash(i * 5 + 2) - 0.5) * 1.5;
    sp.set([x, y, 0], i * 3);
  }
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sMat = new THREE.PointsMaterial({
    color: accent, size: 0.26, transparent: true, opacity: 0.6,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  g.add(new THREE.Points(sGeo, sMat));

  // baseline
  const bMat = additive(accent, 0.25);
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-3.4, -2.6, 0), new THREE.Vector3(3.4, -2.6, 0),
  ]), bMat));

  return {
    group: g,
    update(t, o) {
      // the prediction draws itself ahead of the data, then resets
      const n = Math.max(2, Math.floor(((t * 0.22) % 1.25) * SEG));
      cGeo.setDrawRange(0, Math.min(SEG, n));
      cMat.opacity = 0.85 * o; sMat.opacity = 0.6 * o; bMat.opacity = 0.25 * o;
    },
  };
}

function motifDevice(accent) {
  const g = new THREE.Group();
  const rect = (w, h, mat) => {
    const p = [
      [-w, -h], [w, -h], [w, h], [-w, h],
    ];
    const pts = [];
    for (let i = 0; i < 4; i++) {
      pts.push(new THREE.Vector3(...p[i], 0), new THREE.Vector3(...p[(i + 1) % 4], 0));
    }
    return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), mat);
  };
  const oMat = additive(accent, 0.5);
  const iMat = additive(accent, 0.28);
  g.add(rect(2.1, 3.6, oMat));
  g.add(rect(1.75, 3.0, iMat));

  // content rows
  const rMat = additive(0xffffff, 0.35);
  const rp = [];
  for (let i = 0; i < 5; i++) {
    const y = 2.0 - i * 0.9;
    rp.push(new THREE.Vector3(-1.4, y, 0), new THREE.Vector3(1.4 - (i % 2) * 0.8, y, 0));
  }
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rp), rMat));

  // a refresh sweeping the screen
  const scanMat = additive(0xffffff, 0.9);
  const scan = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-1.75, 0, 0), new THREE.Vector3(1.75, 0, 0),
  ]), scanMat);
  g.add(scan);

  return {
    group: g,
    update(t, o) {
      scan.position.y = 3.0 - ((t * 0.5) % 1) * 6.0;
      oMat.opacity = 0.5 * o; iMat.opacity = 0.28 * o;
      rMat.opacity = 0.35 * o; scanMat.opacity = 0.55 * o;
    },
  };
}

const MOTIFS = { ai: motifGraph, systems: motifPipeline, ml: motifCurve, product: motifDevice };

export class GateShot extends Shot {
  constructor() {
    super({
      id: 'gate',
      label: 'THE WORK',
      scrollVh: 130,
      edgeColor: 0xbfe4ff,
      grade: {
        lift: [-0.010, -0.004, 0.012],
        gamma: [1.03, 1.0, 0.97],
        gain: [0.96, 1.0, 1.08],
        sat: 0.9,
        contrast: 1.16,
        // large areas of type again — same reason THESIS runs low
        bloom: 0.38,
      },
    });
    this.rooms = [];
  }

  build() {
    const S = this.scene;

    this.camera.fov = 34;
    this.camera.near = 0.5;
    this.camera.far = 900;
    this.camera.updateProjectionMatrix();

    /* ---- the chamber: the THESIS duct, opened out ---- */
    const DX = 30;
    const DY = 9.5;
    const corner = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const railPts = [];
    for (const [sx, sy] of corner) {
      railPts.push(
        new THREE.Vector3(sx * DX, sy * DY, 30),
        new THREE.Vector3(sx * DX, sy * DY, -420),
      );
    }
    S.add(new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(railPts),
      new THREE.LineBasicMaterial({
        color: 0x3f86c4, transparent: true, opacity: 0.22,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }),
    ));

    this.ties = new THREE.Group();
    this.tieGap = 26;
    for (let i = 0; i < 20; i++) {
      const pts = [];
      for (let j = 0; j < 4; j++) {
        const [ax, ay] = corner[j];
        const [bx, by] = corner[(j + 1) % 4];
        pts.push(
          new THREE.Vector3(ax * DX, ay * DY, 0),
          new THREE.Vector3(bx * DX, by * DY, 0),
        );
      }
      const line = new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({
          color: 0x2f6ea8, transparent: true, opacity: 0.3,
          depthWrite: false, blending: THREE.AdditiveBlending,
        }),
      );
      line.position.z = 26 - i * this.tieGap;
      this.ties.add(line);
    }
    S.add(this.ties);

    /* ---- the four rooms ---- */
    this.rooms = CATEGORIES.map((cat, i) => {
      const slot = SLOTS[i];
      const g = new THREE.Group();
      g.position.set(slot.x, slot.y, slot.z);
      // angled in toward the axis, so each portal faces the passing camera
      g.rotation.y = slot.x < 0 ? 0.42 : -0.42;

      // the doorway itself
      const f = PORTAL_W / 2;
      const h = PORTAL_H / 2;
      const frame = [
        [-f, -h], [f, -h], [f, h], [-f, h],
      ];
      const pts = [];
      for (let j = 0; j < 4; j++) {
        const [ax, ay] = frame[j];
        const [bx, by] = frame[(j + 1) % 4];
        pts.push(new THREE.Vector3(ax, ay, 0), new THREE.Vector3(bx, by, 0));
      }
      /* Dim on purpose. The doorway is structure, not content — left bright it was
         the strongest thing in the frame, and being thin, saturated and near the
         frame edge it caught the most radial chromatic aberration in the stack, so
         the portals read as red/green fringed rectangles with the type as an
         afterthought. The type is the reason the shot exists. */
      const frameMat = new THREE.LineBasicMaterial({
        color: cat.accent, transparent: true, opacity: 0.44,
        depthWrite: false, blending: THREE.AdditiveBlending,
      });
      g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), frameMat));

      // the room number, set large and quiet behind the label
      const num = textPlane(cat.n, {
        height: 2.6,
        font: '"JetBrains Mono", ui-monospace, monospace',
        weight: 500, size: 80, tracking: 0.18,
        color: cat.accent, hot: 0xeaf6ff, halo: TIGHT_HALO, glow: 0.12,
      });
      num.position.set(-f + 2.4, h - 1.9, 0.1);
      g.add(num);

      // category name
      const label = textPlane(null, {
        paragraph: cat.label.split(' & ').length > 1 && cat.label.length > 14
          ? cat.label.split(' & ').map((s, k) => (k === 0 ? `${s} &` : s))
          : [cat.label],
        height: 2.5,
        font: '"Space Grotesk", system-ui, sans-serif',
        weight: 700, size: 96, tracking: -0.005, leading: 1.1, align: 'left',
        color: 0xdbeeff, hot: 0xffffff, halo: TIGHT_HALO, glow: 0.20,
      });
      label.position.set(-f + 2.2 + label.scale.x / 2, h - 4.9, 0.1);
      g.add(label);

      // the claim
      /* Sizes here are set against the FRAME, not the portal. A portal fills about
         half the frame height at the distance it becomes legible, so anything
         under ~1 world unit lands at roughly 16px and cannot be read at all —
         which is what the first pass shipped. */
      const line = textPlane(null, {
        paragraph: [cat.line],
        height: 0.92,
        font: '"Space Grotesk", system-ui, sans-serif',
        weight: 400, size: 44, align: 'left',
        color: 0xa8ccec, hot: 0xdff0ff, halo: TIGHT_HALO, glow: 0.14,
      });
      line.position.set(-f + 2.2 + line.scale.x / 2, h - 7.1, 0.1);
      g.add(line);

      /* the projects, listed line by line — this is the part that scales. A room
         with two entries and a room with nine look the same from the outside. */
      const members = projectsIn(cat.id);
      /* Row pitch is derived from the count, so a room with two entries and a
         room with nine both fit the same doorway. This is the part that has to
         survive the project list tripling. */
      const listTop = h - 9.2;
      const listBottom = -h + 2.8;
      const pitch = Math.min(1.7, (listTop - listBottom) / Math.max(1, members.length));
      members.forEach((p, k) => {
        const row = textPlane(null, {
          paragraph: [`${String(p.index).padStart(2, '0')}   ${p.name}`],
          height: Math.min(0.98, pitch * 0.58),
          font: '"JetBrains Mono", ui-monospace, monospace',
          weight: 400, size: 42, tracking: 0.06, align: 'left',
          color: 0xbcd8f5, hot: 0xeaf6ff, halo: TIGHT_HALO, glow: 0.10,
        });
        row.position.set(-f + 2.2 + row.scale.x / 2, listTop - k * pitch, 0.1);
        g.add(row);
      });

      const count = textPlane(null, {
        paragraph: [`${members.length} ${members.length === 1 ? 'PROJECT' : 'PROJECTS'}`],
        height: 0.78,
        font: '"JetBrains Mono", ui-monospace, monospace',
        weight: 500, size: 40, tracking: 0.22, align: 'left',
        color: cat.accent, hot: 0xffffff, halo: TIGHT_HALO, glow: 0.14,
      });
      count.position.set(-f + 2.2 + count.scale.x / 2, -h + 1.2, 0.1);
      g.add(count);

      // the room's signature, opposite the type
      const motif = MOTIFS[cat.id]?.(cat.accent) ?? null;
      if (motif) {
        motif.group.position.set(f - 6.0, 0.6, 0.1);
        g.add(motif.group);
      }

      S.add(g);

      const parts = [];
      g.traverse((o) => { if (o.setOpacity) parts.push(o); });
      return { cat, group: g, frameMat, parts, slot, motif, first: members[0] };
    });

    /* ---- particulate, so the chamber is not vacuum ---- */
    const N = 500;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos.set([
        (Math.random() - 0.5) * 62,
        (Math.random() - 0.5) * 20,
        30 - Math.random() * 260,
      ], i * 3);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.motes = new THREE.Points(pg, new THREE.PointsMaterial({
      color: 0x8fc4ee, size: 0.05, transparent: true, opacity: 0.35,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    S.add(this.motes);
  }

  update(dt, t, localP) {
    const z = CAM_Z0 + (CAM_Z1 - CAM_Z0) * localP;

    this.camera.position.set(
      Math.sin(t * 0.29) * 0.3 + input.px * 1.4,
      Math.cos(t * 0.24) * 0.2 + input.py * 0.9,
      z,
    );
    this.camera.lookAt(
      Math.sin(t * 0.12) * 0.6 + input.px * 0.7,
      Math.cos(t * 0.10) * 0.4 + input.py * 0.4,
      z - 40,
    );
    /* Counter-roll against the helix. The rooms are wound around the axis, so a
       small, steady roll as the camera advances is what turns "four things at
       different offsets" into a chamber revolving around you. Kept tiny — the type
       has to stay level enough to read. */
    this.camera.rotation.z = -localP * 0.07 + Math.sin(t * 0.17) * 0.004;

    const span = this.ties.children.length * this.tieGap;
    for (const tie of this.ties.children) {
      let tz = tie.position.z;
      if (tz > z + 30) tz -= span;
      tie.position.z = tz;
      const ahead = z - tz;
      tie.material.opacity = 0.34 * ramp(ahead, 250, 55) * lramp(ahead, -6, 12);
    }

    for (const r of this.rooms) {
      const ahead = z - r.slot.z;
      /* Resolves out of the dark, holds while it is well framed, and is gone
         before the camera draws level with it — past ~16 units the portal is
         outside the frame edge anyway, so holding it lit only cost fill rate and
         left a bright sliver sliding off the side. */
      const o = ramp(ahead, 132, 88) * ramp(ahead, 16, 34);
      r.group.visible = o > 0.02;
      for (const p of r.parts) p.setOpacity(o);
      r.frameMat.opacity = 0.44 * o;
      r.motif?.update(t, o);
      r.opacity = o;
    }

    this.motes.rotation.z = t * 0.004;
  }

  /** Screen position of each room, for the DOM click targets. */
  anchors() {
    if (!this.rooms.length) return [];
    const v = new THREE.Vector3();
    return this.rooms.map((r) => {
      v.set(r.slot.x, r.slot.y, r.slot.z).project(this.camera);
      return {
        id: r.cat.id,
        label: r.cat.label,
        first: r.first,
        opacity: r.opacity ?? 0,
        x: (v.x * 0.5 + 0.5) * 100,
        y: (-v.y * 0.5 + 0.5) * 100,
        infront: v.z < 1,
      };
    });
  }
}
