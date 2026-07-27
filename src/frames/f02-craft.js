import * as THREE from 'three';
import { buildEnvironment, FINISH } from '../core/material.js';

/* ==================================================================
   FRAME 02 — THE CRAFT

   The gas has set once; here it is still molecular. A chrome molecule
   turns in the dark while three lines say what the work actually is.
   Same material language as the title, so the film reads continuous.
================================================================== */

export function createCraftFrame({ scene, renderer, rig, pointer, range: [P0, P1], center }) {
  const group = new THREE.Group();
  group.position.copy(center);
  scene.add(group);

  const envMap = buildEnvironment(renderer, { accentA: 0x7b5cff, accentB: 0x28e0ff, key: 3.6 });
  const mat = FINISH.chrome(envMap);
  mat.transparent = true;
  mat.opacity = 0;

  /* ---- a molecule: atoms, and the bonds between the close ones ---- */
  /* held right of centre so the copy on the left reads against dark */
  const molecule = new THREE.Group();
  molecule.position.x = 9;
  group.add(molecule);

  const atoms = [];
  const COUNT = 15;
  for (let i = 0; i < COUNT; i++) {
    /* Fibonacci-ish shell so the cluster reads as a structure rather
       than a random scatter, with a couple pulled inward for depth */
    const k = i / COUNT;
    const phi = Math.acos(1 - 2 * (k + 0.5 / COUNT));
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const rad = 7.4 * (0.55 + 0.45 * Math.pow((i * 37 % 11) / 11, 0.6));
    atoms.push(new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * rad,
      Math.cos(phi) * rad * 0.78,
      Math.sin(phi) * Math.sin(theta) * rad,
    ));
  }

  const sphereGeo = new THREE.SphereGeometry(1, 40, 28);
  atoms.forEach((p, i) => {
    const m = new THREE.Mesh(sphereGeo, mat);
    m.position.copy(p);
    m.scale.setScalar(0.85 + ((i * 17) % 7) / 7 * 1.05);
    molecule.add(m);
  });

  const bondGeo = new THREE.CylinderGeometry(0.17, 0.17, 1, 14, 1, true);
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const d = atoms[i].distanceTo(atoms[j]);
      if (d > 6.6) continue;
      const bond = new THREE.Mesh(bondGeo, mat);
      bond.position.copy(atoms[i]).add(atoms[j]).multiplyScalar(0.5);
      bond.scale.y = d;
      bond.quaternion.setFromUnitVectors(up, atoms[j].clone().sub(atoms[i]).normalize());
      molecule.add(bond);
    }
  }

  /* ---- camera: drift past the structure while the copy lands ---- */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const C = center;
  const at = k => P0 + (P1 - P0) * k;
  rig
    .key(P0,       { pos: V(C.x + 5, C.y + 3, C.z + 34), look: V(C.x, C.y, C.z),     roll: 0.020, fov: 50, focus: 34 })
    .key(at(0.42), { pos: V(C.x - 6, C.y + 1, C.z + 25), look: V(C.x, C.y, C.z),     roll: 0.004, fov: 47, focus: 25, hold: true })
    .key(at(0.80), { pos: V(C.x + 4, C.y - 2, C.z + 17), look: V(C.x, C.y, C.z),     roll: -0.012, fov: 46, focus: 18 })
    .key(P1,       { pos: V(C.x, C.y, C.z - 16),         look: V(C.x, C.y, C.z - 70), roll: -0.02, fov: 54, focus: 40 });

  return {
    group,
    focusPlane: center.z,

    update(P, dt, t) {
      const local = THREE.MathUtils.clamp((P - P0) / (P1 - P0), 0, 1);
      const inFade  = THREE.MathUtils.smoothstep(local, 0.0, 0.16);
      const outFade = 1 - THREE.MathUtils.smoothstep(local, 0.80, 1.0);
      const vis = inFade * outFade;

      mat.opacity = vis;
      group.visible = vis > 0.002;

      molecule.rotation.y = t * 0.11 + pointer.smooth.x * 0.30;
      molecule.rotation.x = Math.sin(t * 0.17) * 0.11 - pointer.smooth.y * 0.18;
      molecule.scale.setScalar(0.9 + 0.1 * vis);
    },
  };
}
