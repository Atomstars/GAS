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

export const NEUTRAL_GRADE = {
  lift: [0, 0, 0],
  gamma: [1, 1, 1],
  gain: [1, 1, 1],
  sat: 1,
  contrast: 1,
  bloom: 0.8,
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
