import * as THREE from 'three';
import { Effect } from 'postprocessing';

/* Per-shot colour grade — lift / gamma / gain + saturation + contrast.
   This is the effect that makes each project world read as its own sector
   rather than the same scene with a different hue. */

const frag = /* glsl */ `
uniform vec3  uLift;
uniform vec3  uGamma;
uniform vec3  uGain;
uniform float uSat;
uniform float uContrast;
uniform float uFade;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor){
  vec3 c = inputColor.rgb;

  // lift / gamma / gain
  c = c * uGain + uLift;
  c = pow(max(c, 0.0), 1.0 / max(uGamma, vec3(0.001)));

  // saturation
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSat);

  // contrast around mid grey
  c = (c - 0.5) * uContrast + 0.5;

  // global fade-to-black (used at the very start / end of the film)
  c *= uFade;

  outputColor = vec4(max(c, 0.0), inputColor.a);
}
`;

/* A grade is now the whole look of a shot, not just its colour.

   Vignette, grain and the bloom threshold were fixed globally, tuned once against a
   film that was black in every frame. On a high-key set those same three numbers are
   what destroy it: a 0.78 vignette eats the corners of a white frame, and a bloom
   threshold of 0.22 means a near-white set is ENTIRELY above the threshold, so the
   HUGE kernel blurs the whole frame back over itself as milk. SHOTLIST §4 R4 asks
   each world to declare a key; this is what lets it. */
export const NEUTRAL_GRADE = {
  lift: [0, 0, 0],
  gamma: [1, 1, 1],
  gain: [1, 1, 1],
  sat: 1,
  contrast: 1,
  bloom: 0.8,
  // R4 ceilings: vignette <= 0.35, grain <= 0.045 on any shot that ships
  vignette: 0.78,
  vignetteOffset: 0.22,
  grain: 0.28,
  // luminance above which a pixel blooms. Low for a dark set, high for a bright one.
  bloomThreshold: 0.22,
};

export class GradeEffect extends Effect {
  constructor() {
    super('GradeEffect', frag, {
      uniforms: new Map([
        ['uLift', new THREE.Uniform(new THREE.Vector3(0, 0, 0))],
        ['uGamma', new THREE.Uniform(new THREE.Vector3(1, 1, 1))],
        ['uGain', new THREE.Uniform(new THREE.Vector3(1, 1, 1))],
        ['uSat', new THREE.Uniform(1)],
        ['uContrast', new THREE.Uniform(1)],
        ['uFade', new THREE.Uniform(1)],
      ]),
    });
  }

  get lift() { return this.uniforms.get('uLift').value; }
  get gamma() { return this.uniforms.get('uGamma').value; }
  get gain() { return this.uniforms.get('uGain').value; }
  set sat(v) { this.uniforms.get('uSat').value = v; }
  set contrast(v) { this.uniforms.get('uContrast').value = v; }
  set fade(v) { this.uniforms.get('uFade').value = v; }
}
