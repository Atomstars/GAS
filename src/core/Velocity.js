import * as THREE from 'three';
import { Effect } from 'postprocessing';

/* Scroll velocity you can SEE.

   Scrolling fast smears the frame along the scroll axis and prismatically
   splits the channels, plus a radial zoom-streak from frame centre. This is the
   single most-felt effect on a scroll-piloted site: it makes the scroll wheel
   feel connected to the image instead of just moving a camera. */

const frag = /* glsl */ `
uniform float uAmount;   // 0..1, from scroll velocity
uniform vec2  uDir;      // screen-space scroll direction
uniform float uRadial;   // radial zoom-streak weight

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor){
  if (uAmount < 0.002) { outputColor = inputColor; return; }

  vec2 fromCentre = uv - 0.5;
  vec2 base = uDir * 0.075 + fromCentre * uRadial * 0.10;
  vec2 step = base * uAmount;

  vec3 sum = vec3(0.0);
  const int N = 10;
  for (int i = 0; i < N; i++){
    float t = float(i) / float(N - 1) - 0.5;
    vec2 o = step * t;
    // per-channel scaling -> prismatic smear, not a grey blur
    sum.r += texture2D(inputBuffer, uv + o * 1.22).r;
    sum.g += texture2D(inputBuffer, uv + o * 1.00).g;
    sum.b += texture2D(inputBuffer, uv + o * 0.80).b;
  }
  sum /= float(N);

  // the smear brightens slightly as it stretches — reads as light, not mud
  sum *= 1.0 + uAmount * 0.16;

  outputColor = vec4(sum, inputColor.a);
}
`;

export class VelocityEffect extends Effect {
  constructor() {
    super('VelocityEffect', frag, {
      uniforms: new Map([
        ['uAmount', new THREE.Uniform(0)],
        ['uDir', new THREE.Uniform(new THREE.Vector2(0, 1))],
        ['uRadial', new THREE.Uniform(1)],
      ]),
    });
  }

  set amount(v) { this.uniforms.get('uAmount').value = v; }
  get amount() { return this.uniforms.get('uAmount').value; }
  set radial(v) { this.uniforms.get('uRadial').value = v; }
  get dir() { return this.uniforms.get('uDir').value; }
}
