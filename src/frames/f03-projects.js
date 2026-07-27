import * as THREE from 'three';
import { makeTextGeometry } from '../core/text3d.js';
import { buildEnvironment, FINISH } from '../core/material.js';
import { makeStage } from '../core/stage.js';
import { makeScreen, loadProjectTexture } from '../core/screen.js';

/* ==================================================================
   FRAMES 03–08 — THE WORK

   One world per project. They share a material language so the film
   stays continuous, and share nothing else: each gets its own form,
   its own accent lighting and its own motion, because a template with
   the colours swapped is exactly what a portfolio must not look like.
================================================================== */

/* ---------------- the forms ---------------- */

function orbitalRings(mat) {                     // DAVINA — aerospace
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6, 4), mat);
  g.add(core);
  const rings = [];
  [[6.5, 0.20], [8.8, 0.16], [11.4, 0.13]].forEach(([r, t], i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, t, 18, 190), mat);
    ring.rotation.x = Math.PI / 2 + (i - 1) * 0.42;
    ring.rotation.z = i * 0.6;
    g.add(ring); rings.push(ring);
  });
  g.userData.tick = (t) => {
    core.rotation.y = t * 0.3;
    rings.forEach((r, i) => { r.rotation.z += 0.0016 * (i + 1); r.rotation.y = Math.sin(t * 0.2 + i) * 0.25; });
  };
  return g;
}

function glyphLattice(mat) {                     // GMAT — language as structure
  const g = new THREE.Group();
  const bar = new THREE.BoxGeometry(1, 1, 1);
  const rows = 7, cols = 9;
  const bars = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r * 7 + c * 3) % 5 === 0) continue;            // gaps make it read as text
      const m = new THREE.Mesh(bar, mat);
      const w = 0.6 + ((r * 5 + c) % 4) * 0.75;
      m.scale.set(w, 0.42, 0.42);
      m.position.set((c - (cols - 1) / 2) * 2.05, (r - (rows - 1) / 2) * 1.55, ((r + c) % 3 - 1) * 0.9);
      g.add(m); bars.push({ m, seed: r * 3.1 + c * 1.7, x: m.position.x });
    }
  }
  g.userData.tick = (t) => {
    for (const b of bars) b.m.position.x = b.x + Math.sin(t * 0.7 + b.seed) * 0.42;
  };
  return g;
}

function signalNetwork(mat) {                    // JOB-AGENT — a graph that fires
  const g = new THREE.Group();
  const nodes = [];
  const sph = new THREE.SphereGeometry(1, 26, 18);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2, r = 4.2 + ((i * 13) % 9) * 0.92;
    const p = new THREE.Vector3(Math.cos(a) * r, ((i * 7) % 11 - 5) * 1.25, Math.sin(a) * r * 0.82);
    const m = new THREE.Mesh(sph, mat);
    m.position.copy(p); m.scale.setScalar(0.5 + ((i * 5) % 6) / 6 * 0.7);
    g.add(m); nodes.push({ m, p, seed: i * 0.83 });
  }
  const cyl = new THREE.CylinderGeometry(0.09, 0.09, 1, 8, 1, true);
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < nodes.length; i++) {
    const j = (i * 7 + 3) % nodes.length;
    const d = nodes[i].p.distanceTo(nodes[j].p);
    if (d > 13) continue;
    const link = new THREE.Mesh(cyl, mat);
    link.position.copy(nodes[i].p).add(nodes[j].p).multiplyScalar(0.5);
    link.scale.y = d;
    link.quaternion.setFromUnitVectors(up, nodes[j].p.clone().sub(nodes[i].p).normalize());
    g.add(link);
  }
  g.userData.tick = (t) => {
    g.rotation.y = t * 0.16;
    for (const n of nodes) n.m.position.y = n.p.y + Math.sin(t * 1.3 + n.seed) * 0.5;
  };
  return g;
}

function gearFlow(mat) {                         // CAFÉ POS — a working machine
  const g = new THREE.Group();
  const gears = [];
  const teeth = (R, n, w) => {
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(new THREE.TorusGeometry(R, w * 0.55, 14, 90), mat));
    const tooth = new THREE.BoxGeometry(w * 1.5, w * 1.25, w * 1.6);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const m = new THREE.Mesh(tooth, mat);
      m.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
      m.rotation.z = a;
      grp.add(m);
    }
    return grp;
  };
  [[5.6, 20, 0.62, -6.5, 1.5, 0], [4.0, 14, 0.58, 3.4, -2.6, 1.2], [2.8, 10, 0.54, 8.6, 3.4, -1.0]]
    .forEach(([R, n, w, x, y, z], i) => {
      const gear = teeth(R, n, w);
      gear.position.set(x, y, z);
      g.add(gear);
      gears.push({ gear, dir: i % 2 ? -1 : 1, sp: 0.34 / R });
    });
  g.userData.tick = (t) => { for (const q of gears) q.gear.rotation.z = t * q.sp * q.dir * 6; };
  return g;
}

/* HOUSING — the market as a city that rises and falls.
   A smooth surface here was a mirror the size of the frame pointed
   straight at the key light, which blows out to white; broken into
   towers it catches highlights instead of reflecting the whole room,
   and a skyline is the truer picture of a housing market anyway. */
function priceCity(mat) {
  const g = new THREE.Group();
  const COLS = 15, ROWS = 10, PITCH = 1.30;
  const N = COLS * ROWS;

  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.95, 1, 0.95), mat, N);
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  g.add(inst);

  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      cells.push({ x: (c - (COLS - 1) / 2) * PITCH, z: (r - (ROWS - 1) / 2) * PITCH });
    }
  }

  const dummy = new THREE.Object3D();
  g.userData.tick = (t) => {
    cells.forEach((cell, k) => {
      const h = 3.6
        + Math.sin(cell.x * 0.42 + t * 0.55) * 1.5
        + Math.cos(cell.z * 0.52 - t * 0.40) * 1.2
        + Math.sin((cell.x + cell.z) * 0.24 + t * 0.24) * 1.7;
      const hh = Math.max(0.5, h);
      dummy.position.set(cell.x, hh / 2 - 3.6, cell.z);
      dummy.scale.set(1, hh, 1);
      dummy.updateMatrix();
      inst.setMatrixAt(k, dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
    g.rotation.y = Math.sin(t * 0.09) * 0.20;
  };
  return g;
}

function companionForm(mat) {                    // BUDDY — the human-scale frame
  const g = new THREE.Group();
  const big = new THREE.Mesh(new THREE.SphereGeometry(5.0, 60, 44), mat);
  const small = new THREE.Mesh(new THREE.SphereGeometry(2.5, 48, 34), mat);
  small.position.set(7.0, 1.6, 1.4);
  g.add(big, small);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(8.6, 0.11, 12, 160), mat);
  ring.rotation.x = Math.PI / 2.3;
  g.add(ring);
  g.userData.tick = (t) => {
    big.rotation.y = t * 0.13;
    const a = t * 0.5;
    small.position.set(Math.cos(a) * 7.4, 1.4 + Math.sin(t * 0.8) * 0.9, Math.sin(a) * 7.4 * 0.6);
    ring.rotation.z = t * 0.08;
  };
  return g;
}

const FORMS = {
  davina: orbitalRings,
  gmat: glyphLattice,
  'job-agent': signalNetwork,
  'cafe-pos': gearFlow,
  housing: priceCity,
  buddy: companionForm,
};

const ACCENTS = {
  davina:      { a: 0x6ec8ff, b: 0xffffff, finish: 'chrome'  },
  gmat:        { a: 0x7ae8ff, b: 0x9b7bff, finish: 'glass'   },
  'job-agent': { a: 0xffb066, b: 0xff4d6d, finish: 'chrome'  },
  'cafe-pos':  { a: 0xffd9a0, b: 0xff8a3d, finish: 'mercury' },
  housing:     { a: 0xa0ffc8, b: 0x35d0ff, finish: 'chrome'  },
  buddy:       { a: 0xc89aff, b: 0xff7ad9, finish: 'glass'   },
};

/* ---------------- the frames ---------------- */

export function createProjectFrames({ scene, camera, renderer, rig, pointer, projects, range: [P0, P1], startZ, stepZ }) {
  const span = (P1 - P0) / projects.length;
  const frames = [];
  const _camLocal = new THREE.Vector3();

  projects.forEach((proj, i) => {
    const acc = ACCENTS[proj.id] ?? { a: 0x8fb8ff, b: 0xff7ad9, finish: 'chrome' };
    const envMap = buildEnvironment(renderer, { accentA: acc.a, accentB: acc.b, key: 3.1 });
    const mat = FINISH[acc.finish](envMap);
    mat.transparent = true;
    mat.opacity = 0;

    const center = new THREE.Vector3(i % 2 ? 21 : -21, (i % 3 - 1) * 5.0, startZ - i * stepZ);
    const side = i % 2 ? -1 : 1;   // which shoulder the camera passes on

    const group = new THREE.Group();
    group.position.copy(center);
    scene.add(group);

    const form = FORMS[proj.id](mat);
    form.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    group.add(form);

    /* the product itself, standing in the room behind its form */
    const accentCss = '#' + acc.a.toString(16).padStart(6, '0');
    const screen = makeScreen({
      texture: loadProjectTexture(proj, accentCss, tex => screen.setTexture(tex)),
      width: 21, envMap,
    });
    screen.group.position.set(0, 3.4, -13);
    screen.group.rotation.y = side * 0.16;
    screen.group.rotation.x = -0.05;
    group.add(screen.group);

    const stage = makeStage({
      envMap, accent: acc.a,
      groundY: -15, groundSize: 165,
      shafts: 3, shaftIntensity: 0.28, dust: 380, dustSpread: 58,
    });
    group.add(stage.group);

    /* the name is geometry too — DOM type over 3D is what makes a site
       look like a website with a 3D background instead of a film */
    const nameGeo = makeTextGeometry(proj.name, { width: 19, depth: 0.8, quality: 'low' });
    const name = new THREE.Mesh(nameGeo, mat);
    /* clear of the letterbox bar, and clear of the floor it stands on */
    name.position.set(0, -10.2, 7);
    group.add(name);

    const p0 = P0 + i * span, p1 = p0 + span;
    const C = center;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);

    /* Serpentine: approach from the far side, hold beside the object,
       then carry on past it toward the next. One unbroken move. */
    rig
      .key(p0,               { pos: V(C.x + side * 32, C.y + 8, C.z + 50), look: V(C.x, C.y - 1, C.z), roll: side * 0.030,  fov: 50, focus: 56 })
      .key(p0 + span * 0.46, { pos: V(C.x + side * 20, C.y + 3, C.z + 30), look: V(C.x, C.y - 2, C.z), roll: side * 0.012,  fov: 46, focus: 34, hold: true })
      .key(p0 + span * 0.99, { pos: V(C.x - side * 24, C.y - 3, C.z - 32), look: V(C.x, C.y, C.z - 10), roll: -side * 0.022, fov: 52, focus: 38 });

    frames.push({
      id: proj.id,
      project: proj,
      group,
      p0, p1,
      focusPlane: center.z,

      update(P, dt, t, sweep = 0) {
        const local = (P - p0) / span;
        const vis = THREE.MathUtils.smoothstep(local, -0.16, 0.10)
                  * (1 - THREE.MathUtils.smoothstep(local, 0.90, 1.14));
        group.visible = vis > 0.003;
        if (!group.visible) return;
        name.castShadow = true;

        mat.opacity = vis;
        stage.update(t, vis, sweep);
        screen.update(vis, t);
        form.userData.tick?.(t);
        form.rotation.y += pointer.smooth.x * 0.0016;
        group.rotation.y = pointer.smooth.x * 0.12;
        group.rotation.x = -pointer.smooth.y * 0.07;

        /* The camera passes these worlds at an angle, so a fixed name is
           read edge-on and becomes unreadable. Yaw it to face the lens —
           tilt is left alone so it still sits in the scene rather than
           floating like a UI label. */
        _camLocal.copy(camera.position);
        group.worldToLocal(_camLocal);
        name.rotation.set(
          -0.12 + pointer.smooth.y * 0.03,
          Math.atan2(_camLocal.x - name.position.x, _camLocal.z - name.position.z),
          0,
        );
      },
    });
  });

  return frames;
}
