import * as THREE from 'three';
import { SIMPLEX_3D, FLOW_FIELD } from '../shaders/noise.js';
import { makeTextGeometry, sampleSurface } from '../core/text3d.js';
import { buildEnvironment, FINISH, SHARED } from '../core/material.js';

/* ==================================================================
   FRAME 01 — GAS

   The molecules gather into the word, and then the word *sets*.

   The particle targets are sampled off the surface of the real solid,
   so the cloud does not condense into an approximation of the title —
   it condenses onto the exact object it is about to become. When it
   arrives, the solid takes over and the gas thins to a haze around it.
================================================================== */

const WIDTH = 30;
const DEPTH = 3.2;
const RISE = 1.6;
const BASE_DIST = 30;

export async function createTitleFrame({ scene, camera, renderer, rig, pointer, range: [P0, P1], maxParticles = 90000 }) {
  const group = new THREE.Group();
  scene.add(group);

  /* ---------------- the solid ---------------- */
  const envMap = buildEnvironment(renderer, { accentA: 0x59e2ff, accentB: 0xff5fd2, key: 3.4 });
  const geo = makeTextGeometry('GAS', { width: WIDTH, depth: DEPTH, quality: 'high' });

  const solidMat = FINISH.chrome(envMap);
  solidMat.transparent = true;
  solidMat.opacity = 0;
  const solid = new THREE.Mesh(geo, solidMat);
  solid.position.y = RISE;
  solid.visible = false;
  group.add(solid);

  /* ---------------- the gas ---------------- */
  const N = Math.min(maxParticles, 200000);
  const targets = sampleSurface(geo, N);

  const aOrigin = new Float32Array(N * 3);
  const aSeed = new Float32Array(N);
  const aScale = new Float32Array(N);
  const aTint = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    const r = 16 + Math.pow(Math.random(), 0.65) * 50;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    aOrigin[i * 3]     = Math.sin(ph) * Math.cos(th) * r;
    aOrigin[i * 3 + 1] = Math.cos(ph) * r * 0.62;
    aOrigin[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r * 0.85 - 6;
    aSeed[i] = Math.random() * 100;
    aScale[i] = 0.5 + Math.pow(Math.random(), 2.2) * 2.4;
    aTint[i] = THREE.MathUtils.clamp(
      targets[i * 3] / WIDTH + 0.5 + (Math.random() - 0.5) * 0.3, 0, 1);
    targets[i * 3 + 1] += RISE;
  }

  const gasGeo = new THREE.BufferGeometry();
  gasGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  gasGeo.setAttribute('aTarget', new THREE.BufferAttribute(targets, 3));
  gasGeo.setAttribute('aOrigin', new THREE.BufferAttribute(aOrigin, 3));
  gasGeo.setAttribute('aSeed',   new THREE.BufferAttribute(aSeed, 1));
  gasGeo.setAttribute('aScale',  new THREE.BufferAttribute(aScale, 1));
  gasGeo.setAttribute('aTint',   new THREE.BufferAttribute(aTint, 1));
  gasGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 220);

  const REF = 70000;
  const gain = THREE.MathUtils.clamp(REF / N, 0.2, 1.0);

  const gasMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }, uCondense: { value: 0 }, uSolid: { value: 0 },
      uFlow: { value: 7.0 }, uSize: { value: 0.55 + 0.45 * Math.pow(gain, 0.4) },
      uOpacity: { value: 1 }, uGain: { value: gain },
      uPointer: SHARED.uPointer, uPush: { value: 0 },
      uPixelRatio: { value: Math.min(devicePixelRatio, 2) },
    },
    vertexShader: SIMPLEX_3D + FLOW_FIELD + /* glsl */ `
      attribute vec3 aTarget; attribute vec3 aOrigin;
      attribute float aSeed; attribute float aScale; attribute float aTint;
      uniform float uTime, uCondense, uSolid, uFlow, uSize, uPush, uPixelRatio;
      uniform vec3 uPointer;
      varying float vTint, vGlow, vShrink;

      void main() {
        float t = uTime;

        vec3 gp = aOrigin + flowField(aOrigin * 0.055 + aSeed * 0.008, t * 0.035) * uFlow;
        float ang = t * 0.045 + length(aOrigin.xz) * 0.010;
        float ca = cos(ang), sa = sin(ang);
        gp.xz = mat2(ca, -sa, sa, ca) * gp.xz;

        /* once set, the haze that remains lifts slowly off the solid */
        vec3 tp = aTarget + flowField(aTarget * 0.42 + aSeed * 0.05, t * 0.10)
                          * (0.16 + uSolid * 1.5);

        vec3 pos = mix(gp, tp, uCondense);

        /* the viewer pushes the gas around */
        vec3 away = pos - uPointer;
        float d = length(away);
        pos += normalize(away + 1e-5) * exp(-d * 0.16) * uPush;

        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;

        float sizeMul = mix(3.4, 1.0, uCondense);
        float want = aScale * uSize * sizeMul * uPixelRatio * (58.0 / max(-mv.z, 0.001));
        float got = clamp(want, 1.0, 34.0 * uPixelRatio);
        gl_PointSize = got;
        vShrink = clamp((want * want) / (got * got), 0.0, 1.0);

        vTint = aTint;
        vGlow = uCondense;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity, uGain;
      varying float vTint, vGlow, vShrink;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = dot(d, d) * 4.0;
        if (r > 1.0) discard;
        float a = pow(1.0 - r, mix(1.15, 2.5, vGlow));
        vec3 cool = vec3(0.10, 0.70, 1.00);
        vec3 mid  = vec3(0.46, 0.34, 1.00);
        vec3 hot  = vec3(1.00, 0.26, 0.78);
        vec3 col = vTint < 0.5 ? mix(cool, mid, vTint * 2.0) : mix(mid, hot, (vTint - 0.5) * 2.0);
        col = mix(col, vec3(1.0, 0.96, 0.93), vGlow * 0.42 * pow(1.0 - r, 3.5));
        float o = a * uOpacity * uGain * vShrink * mix(0.20, 1.0, vGlow);
        gl_FragColor = vec4(col * o, o);
      }
    `,
  });

  const gas = new THREE.Points(gasGeo, gasMat);
  group.add(gas);

  /* ---------------- camera ---------------- */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const at = k => P0 + (P1 - P0) * k;
  rig
    .key(P0,      { pos: V(0, 0.4, BASE_DIST), look: V(0, RISE, 0),  roll: -0.018, fov: 46, focus: BASE_DIST })
    .key(at(0.45),{ pos: V(2.2, 1.0, 25),      look: V(0, RISE, 0),  roll: -0.006, fov: 45, focus: 25 })
    .key(at(0.78),{ pos: V(-1.8, 0.2, 17),     look: V(0, RISE, 0),  roll:  0.010, fov: 44, focus: 17, hold: true })
    .key(P1,      { pos: V(0, -1.0, 3),        look: V(0, 0, -30),   roll:  0.028, fov: 58, focus: 12 });

  /* ---------------- the set ---------------- */
  let revealT = 0, condense = 0, solidify = 0;
  const DELAY = 0.9, CONDENSE_DUR = 3.6, SET_DUR = 1.5;
  const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  return {
    group,
    onFormed: null,
    onSet: null,
    _f: false, _s: false,
    focusPlane: 0,

    update(P, dt, t) {
      gasMat.uniforms.uTime.value = t;

      revealT += dt;
      condense = THREE.MathUtils.clamp((revealT - DELAY) / CONDENSE_DUR, 0, 1);
      const c = easeInOut(condense);
      gasMat.uniforms.uCondense.value = c;
      gasMat.uniforms.uFlow.value = 7.0 * (1 - c * 0.86);

      /* the solid arrives just as the gas finishes gathering */
      solidify = THREE.MathUtils.clamp((revealT - DELAY - CONDENSE_DUR * 0.86) / SET_DUR, 0, 1);
      const s = easeInOut(solidify);
      gasMat.uniforms.uSolid.value = s;
      solid.visible = s > 0.001;
      solidMat.opacity = s;

      if (!this._f && c > 0.5) { this._f = true; this.onFormed?.(); }
      if (!this._s && s > 0.6) { this._s = true; this.onSet?.(); }

      /* pointer pushes the cloud; the push fades as the word sets */
      gasMat.uniforms.uPush.value = pointer.active * (1.2 + pointer.speed * 5.0) * (1 - s * 0.75);

      const local = THREE.MathUtils.clamp((P - P0) / (P1 - P0), 0, 1);

      /* leaving: the solid banks away and the haze blows past the lens */
      const out = THREE.MathUtils.smoothstep(local, 0.62, 1.0);
      gasMat.uniforms.uOpacity.value = (1 - out) * (1 - s * 0.82);
      solidMat.opacity = s * (1 - out);
      solid.rotation.y = pointer.smooth.x * 0.10 + out * 0.5;
      solid.rotation.x = -pointer.smooth.y * 0.06;
      solid.position.z = -out * 26;

      group.visible = local < 0.999;
      this.focusPlane = 0;

      /* Responsive framing — hold the word inside any screen shape.
         The 0.72 is real margin, not decoration: at 0.60 the wordmark
         filled 83% of a portrait frame and the bloom spilled past both
         edges, so it read as cropped. The correction also has to hold
         through the whole hero beat and only release as the camera
         starts its push-through, or the word grows off-frame early. */
      const halfFov = THREE.MathUtils.degToRad(camera.fov * 0.5);
      const byW = (WIDTH * 0.72) / (Math.tan(halfFov) * camera.aspect);
      const byH = (WIDTH * 0.34) / Math.tan(halfFov);
      const fit = Math.max(0, Math.max(byW, byH) - BASE_DIST)
                * (1 - THREE.MathUtils.smoothstep(local, 0.30, 0.80));

      rig.offset.z = (1 - c) * 26 + fit;
      rig.offset.y = (1 - c) * 1.4;
      rig.fovOffset = (1 - c) * 12;
    },

    setPixelRatio(pr) { gasMat.uniforms.uPixelRatio.value = pr; },
    seekReveal(v) { revealT = DELAY + THREE.MathUtils.clamp(v, 0, 1) * (CONDENSE_DUR + SET_DUR); },
    get particleCount() { return N; },
  };
}
