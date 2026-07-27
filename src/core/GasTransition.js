import * as THREE from 'three';
import { SIMPLEX3 } from './noise.js';

/* THE SIGNATURE MECHANIC — SHOTLIST.md §2.

   A world does not cut to the next world. It atomizes into gas, the gas churns,
   and the gas recondenses into the next world.

   Implemented in screen space: both shots render to half-float targets, then a
   fullscreen quad advects each by curl-ish noise, breaks them up with a per-pixel
   dissolve threshold, and emits light along the active dissolve edge so the
   break-up reads as igniting gas rather than a crossfade.

   Cost is independent of scene complexity, and it works between ANY two shots —
   which is what makes it a reusable transition operator instead of a one-off. */

const vert = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const frag = /* glsl */ `
precision highp float;

uniform sampler2D tFrom;
uniform sampler2D tTo;
uniform float uProgress;
uniform float uTime;
uniform vec2  uAspect;
uniform vec3  uEdgeColor;
uniform float uEdgeStrength;
uniform float uScale;

varying vec2 vUv;

${SIMPLEX3}

const float PI = 3.14159265359;

// two decorrelated noise fields -> a flow vector
vec2 flow(vec2 uv, float t, float s){
  return vec2(
    snoise(vec3(uv * s, t)),
    snoise(vec3(uv * s + 31.7, t + 11.3))
  );
}

void main(){
  float p = clamp(uProgress, 0.0, 1.0);

  // turbulence envelope: still at both ends, violent in the middle
  float env = pow(sin(p * PI), 0.72);

  float t = uTime * 0.22;

  // multi-octave advection field
  vec2 f =
      flow(vUv, t,        uScale)       * 0.60
    + flow(vUv, t * 1.5,  uScale * 2.2) * 0.28
    + flow(vUv, t * 2.1,  uScale * 4.5) * 0.12;

  // outgoing is blown apart and drifts up; incoming resolves inward
  vec2 uvFrom = vUv + (f * 0.150 * uAspect + vec2(0.0, 0.030)) * env;
  vec2 uvTo   = vUv - (f * 0.115 * uAspect) * env;

  vec3 cFrom = texture2D(tFrom, uvFrom).rgb;
  vec3 cTo   = texture2D(tTo,   uvTo).rgb;

  // per-pixel dissolve threshold — pixels break up, they do not fade together
  float thr =
      (snoise(vec3(vUv * (uScale * 1.3), t * 0.6)) * 0.5 + 0.5) * 0.62
    + (snoise(vec3(vUv * (uScale * 3.0), t * 1.1)) * 0.5 + 0.5) * 0.38;

  // centred so that at p=0.5 the average pixel is genuinely half gone, and the
  // incoming world lags just enough that the midpoint reads as gas, not a blend
  float aFrom = 1.0 - smoothstep(thr * 0.5,        thr * 0.5 + 0.50, p);
  float aTo   =       smoothstep(thr * 0.5 + 0.14, thr * 0.5 + 0.64, p);

  vec3 col = cFrom * aFrom + cTo * aTo;

  // the burn edge: pixels mid-transition emit. this is what feeds bloom and
  // makes the break-up read as gas igniting.
  float eFrom = (1.0 - abs(aFrom * 2.0 - 1.0)) * (1.0 - aTo);
  float eTo   = (1.0 - abs(aTo   * 2.0 - 1.0)) * (1.0 - aFrom);
  float edge  = max(eFrom, eTo);

  // fine filament detail inside the burn
  float fil = snoise(vec3(vUv * (uScale * 6.0), t * 1.7)) * 0.5 + 0.5;
  edge *= mix(0.55, 1.35, fil);

  col += uEdgeColor * edge * env * uEdgeStrength;

  gl_FragColor = vec4(col, 1.0);
}
`;

export class GasTransition {
  constructor(renderer) {
    this.renderer = renderer;

    const opts = {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
    };
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.rtFrom = new THREE.WebGLRenderTarget(size.x, size.y, { ...opts });
    this.rtTo = new THREE.WebGLRenderTarget(size.x, size.y, { ...opts });

    this.material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tFrom: { value: this.rtFrom.texture },
        tTo: { value: this.rtTo.texture },
        uProgress: { value: 0 },
        uTime: { value: 0 },
        uAspect: { value: new THREE.Vector2(1, 1) },
        uEdgeColor: { value: new THREE.Color(0x9fd8ff) },
        // kept modest on purpose: a white-out would hide the match cut, and the
        // shape carrying across is the entire point of the transition
        uEdgeStrength: { value: 1.45 },
        uScale: { value: 2.6 },
      },
    });

    this.scene = new THREE.Scene();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  /** Render both shots into their targets, then hand the blend scene to Post. */
  capture(shotFrom, shotTo) {
    const r = this.renderer;
    const prevTarget = r.getRenderTarget();

    r.setRenderTarget(this.rtFrom);
    r.clear();
    if (shotFrom) r.render(shotFrom.scene, shotFrom.camera);

    r.setRenderTarget(this.rtTo);
    r.clear();
    if (shotTo) r.render(shotTo.scene, shotTo.camera);

    r.setRenderTarget(prevTarget);
  }

  set(progress, time, edgeColor) {
    const u = this.material.uniforms;
    u.uProgress.value = progress;
    u.uTime.value = time;
    if (edgeColor) u.uEdgeColor.value.set(edgeColor);
  }

  /** 0 at the ends, 1 at peak churn — drives extra bloom + aberration in Post. */
  static envelope(p) {
    return Math.pow(Math.sin(Math.max(0, Math.min(1, p)) * Math.PI), 0.72);
  }

  setSize(w, h) {
    this.rtFrom.setSize(w, h);
    this.rtTo.setSize(w, h);
    const a = w / h;
    // keep the advection isotropic regardless of viewport shape
    this.material.uniforms.uAspect.value.set(a >= 1 ? 1 / a : 1, a >= 1 ? 1 : a);
  }
}
