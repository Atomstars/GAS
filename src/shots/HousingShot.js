import * as THREE from 'three';
import { Shot } from '../core/ShotSystem.js';
import { PROJECTS } from '../data/projects.js';
import { SIMPLEX3 } from '../core/noise.js';
import { textPlane } from '../core/Text.js';
import { input } from '../core/Input.js';

/* ACT II / 04 — HOUSING PREDICTOR.  SHOTLIST.md §5.

   A data terrain, flown low. The market is the ground; the model is a line in the
   air above it. The camera flies forward at a fixed altitude and the terrain
   streams underneath, so the shot is about arriving at data you have not seen yet.

   The prediction ribbon is offset FORWARD along the flight axis and samples the
   same field as the ground. That is the whole idea rendered literally: the model's
   line is the terrain's own shape, read early. Because both are displaced by one
   shared GLSL function rather than by a CPU copy, the two can never drift out of
   agreement — the claim is enforced by construction rather than by tuning. */

const DATA = PROJECTS.find((p) => p.id === 'housing');

/* One field, sampled by ground, ridge and contours alike. */
const FIELD = /* glsl */ `
${SIMPLEX3}

uniform float uScroll;
uniform float uAmp;

float terrain(vec2 p){
  vec2 q = vec2(p.x * 0.020, (p.y - uScroll) * 0.016);
  float h = fbm(vec3(q, 0.0), 5);
  // ridged, so the market has spikes and troughs rather than rolling hills
  h = mix(h, 1.0 - abs(h) * 1.7, 0.45);
  return h * uAmp;
}
`;

const groundVert = /* glsl */ `
varying vec3 vPos;
varying float vH;
${FIELD}
void main(){
  vec3 p = position;
  float h = terrain(p.xy);          // plane is authored in XY, laid down below
  vH = h;
  p.z += h;
  vPos = p;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const groundFrag = /* glsl */ `
precision highp float;
uniform vec3  uLow;
uniform vec3  uHigh;
uniform float uAmp;
uniform float uFogNear;
uniform float uFogFar;
uniform float uEyeY;
varying vec3 vPos;
varying float vH;

// analytic grid line with derivative-based width, so it stays 1px at any distance
// instead of aliasing into moire the way a fixed-width fract() line does
float grid(vec2 p, float step_){
  vec2 g = abs(fract(p / step_ - 0.5) - 0.5) / fwidth(p / step_);
  return 1.0 - min(min(g.x, g.y), 1.0);
}

void main(){
  float lines = grid(vPos.xy, 6.0) * 0.75 + grid(vPos.xy, 30.0) * 0.55;

  // contour bands: the price levels
  float band = grid(vec2(vH, vH), uAmp * 0.30) * 0.5;

  float hN = clamp(vH / uAmp * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = mix(uLow, uHigh, pow(hN, 1.4));

  float d = length(vPos.xy - vec2(0.0, uEyeY));
  float fog = 1.0 - smoothstep(uFogNear, uFogFar, d);

  float a = (lines + band) * fog;
  if (a < 0.002) discard;
  gl_FragColor = vec4(col * a * (0.28 + hN * 0.85), 1.0);
}
`;

/* The model's call: the same field, read ahead of where the camera is. */
const ridgeVert = /* glsl */ `
uniform float uLead;
uniform float uLift;
varying float vH;
varying vec3 vPos;
varying vec2 vUv;
${FIELD}
void main(){
  vec3 p = position;
  vUv = uv;
  float h = terrain(vec2(p.x, p.y + uLead));
  vH = h;
  p.z += h + uLift;
  vPos = p;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const ridgeFrag = /* glsl */ `
precision highp float;
uniform vec3  uColor;
uniform vec3  uHot;
uniform float uAmp;
uniform float uFogNear;
uniform float uFogFar;
uniform float uEyeY;
varying float vH;
varying vec3 vPos;
varying vec2 vUv;
void main(){
  // The ribbon is geometry, but it has to READ as a drawn line. Without this
  // cross-section falloff a 9-unit-wide quad at 2.3x gain is simply a white wall
  // down the middle of the frame — measured at 31% mean luminance.
  float edge = 1.0 - smoothstep(0.06, 0.46, abs(vUv.x - 0.5));
  float core = pow(edge, 2.2);

  float hN = clamp(vH / uAmp * 0.5 + 0.5, 0.0, 1.0);
  float d = length(vPos.xy - vec2(0.0, uEyeY));
  float fog = 1.0 - smoothstep(uFogNear, uFogFar, d);

  // The model's call belongs AHEAD of the aircraft. Cutting the near end also
  // stops the ribbon widening into a foreground slab as it passes under the lens.
  float lead = smoothstep(10.0, 46.0, d);

  float a = core * fog * lead;
  if (a < 0.003) discard;
  vec3 col = mix(uColor, uHot, pow(hN, 1.6));
  gl_FragColor = vec4(col * a * 1.15, 1.0);
}
`;

const SPAN_X = 420;
const SPAN_Y = 620;

/* Altitude has to clear the peaks by a wide margin and the look angle has to be
   properly depressed. At AMP 26 / EYE 21 the sightline dropped under 3° and the
   terrain was seen edge-on: every ridge in the field stacked into the same few
   scanlines and the surface read as tangled wire rather than as ground. */
const AMP = 13;
const EYE = 34;          // flight altitude above the mean surface
const PITCH = 21;        // degrees below horizontal

export class HousingShot extends Shot {
  constructor() {
    super({
      id: DATA.id,
      label: DATA.name,
      scrollVh: 145,
      edgeColor: 0x8ff2cc,
      grade: DATA.grade,
    });
    this.data = DATA;
    this.scroll = 0;
  }

  build() {
    const S = this.scene;

    this.camera.fov = 33;
    this.camera.near = 0.5;
    this.camera.far = 1400;
    this.camera.updateProjectionMatrix();

    const shared = {
      uScroll: { value: 0 },
      uAmp: { value: AMP },
      uFogNear: { value: 60 },
      uFogFar: { value: 300 },
      uEyeY: { value: 0 },
    };
    this.shared = shared;

    /* ---- the market surface ---- */
    const g = new THREE.PlaneGeometry(SPAN_X, SPAN_Y, 220, 300);
    this.ground = new THREE.Mesh(g, new THREE.ShaderMaterial({
      vertexShader: groundVert,
      fragmentShader: groundFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        ...shared,
        uLow: { value: new THREE.Color(0x0e5a4c) },
        uHigh: { value: new THREE.Color(0x7ff0c0) },
      },
    }));
    this.ground.rotation.x = -Math.PI / 2;   // authored in XY, laid down flat
    S.add(this.ground);

    /* ---- the prediction: a narrow ribbon leading the ground ---- */
    // Offset in the GEOMETRY, not the transform, so `terrain(p.x, ...)` still
    // samples the field directly beneath the ribbon. Moving the mesh instead would
    // leave the prediction tracing ground it is not actually over.
    const rg = new THREE.PlaneGeometry(3.4, SPAN_Y, 1, 300);
    rg.translate(-17, 0, 0);
    this.ridge = new THREE.Mesh(rg, new THREE.ShaderMaterial({
      vertexShader: ridgeVert,
      fragmentShader: ridgeFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        ...shared,
        uLead: { value: 42 },
        uLift: { value: 6.5 },
        uColor: { value: new THREE.Color(0x2fd8a0) },
        uHot: { value: new THREE.Color(0xdcfff2) },
      },
    }));
    this.ridge.rotation.x = -Math.PI / 2;
    S.add(this.ridge);

    /* ---- in-world labels: what the two lines are ---- */
    this.legend = [
      { text: 'PREDICTED', color: 0xbdfde6, x: -17, y: 74, lift: 13 },
      { text: 'ACTUAL', color: 0x4fd0a8, x: 12, y: 52, lift: 1 },
    ].map((L) => {
      const m = textPlane(L.text, {
        height: 3.0,
        font: '"JetBrains Mono", ui-monospace, monospace',
        weight: 500,
        size: 64,
        tracking: 0.26,
        color: L.color,
        hot: 0xffffff,
        glow: 0.45,
      });
      m.userData.spec = L;
      S.add(m);
      return m;
    });

    /* ---- high particulate so the air above the terrain is not empty ---- */
    const N = 900;
    const pp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pp.set([
        (Math.random() - 0.5) * SPAN_X,
        EYE + Math.random() * 60,
        -Math.random() * SPAN_Y,
      ], i * 3);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    this.motes = new THREE.Points(pg, new THREE.PointsMaterial({
      color: 0x9fe8d0, size: 0.22, transparent: true, opacity: 0.42,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    S.add(this.motes);
  }

  update(dt, t, localP) {
    // scroll flies the aircraft; a constant drift keeps the market moving at rest
    this.scroll = localP * 520 + t * 5.0;
    this.shared.uScroll.value = this.scroll;

    this.camera.position.set(
      Math.sin(t * 0.19) * 2.4 + input.px * 5.5,
      EYE + Math.sin(t * 0.27) * 0.7 + input.py * 3.0,
      0,
    );
    // pitched down the flight path, looking into the oncoming terrain
    const reach = 150;
    this.camera.lookAt(
      Math.sin(t * 0.11) * 3.0 + input.px * 2.4,
      EYE - reach * Math.tan((PITCH * Math.PI) / 180) + input.py * 1.6,
      -reach,
    );
    this.camera.rotation.z = Math.sin(t * 0.15) * 0.007;

    // labels ride alongside the two lines, facing the lens
    for (const m of this.legend) {
      const s = m.userData.spec;
      m.position.set(s.x, EYE - 16 + s.lift, -s.y);
      m.lookAt(this.camera.position);
      m.setOpacity(0.45 + 0.2 * Math.sin(t * 0.9 + s.lift));
    }

    // motes stream toward the lens and recycle
    const pos = this.motes.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let z = pos.getZ(i) + dt * 34;
      if (z > 30) z -= SPAN_Y;
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
  }
}
