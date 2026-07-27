import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ==================================================================
   THE LENS
   Every frame of this film is shot through this. Nothing here knows
   what it is looking at — it only knows how a camera lens behaves:
   it defocuses, it blooms, it streaks, it splits colour at the edges,
   it vignettes, and it lays grain over everything.

   This is the layer that separates "a WebGL scene" from "a shot".
================================================================== */

/* Final composite: anamorphic streaks, chromatic aberration, barrel
   distortion, film response curve, split-tone, vignette, grain,
   letterbox, fade-to-black. One pass, so it stays cheap. */
const FinalComposite = {
  uniforms: {
    tDiffuse:     { value: null },
    uTime:        { value: 0 },
    uResolution:  { value: new THREE.Vector2(1, 1) },
    uAberration:  { value: 1.0 },
    uDistortion:  { value: 0.055 },
    uStreak:      { value: 0.55 },
    uStreakTint:  { value: new THREE.Color(0.30, 0.68, 1.7) },
    uVignette:    { value: 1.0 },
    uGrain:       { value: 0.055 },
    uBars:        { value: 0.10 },
    uExposure:    { value: 1.0 },
    uContrast:    { value: 1.06 },
    uSaturation:  { value: 1.06 },
    uFade:        { value: 0.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uAberration, uDistortion, uStreak, uVignette;
    uniform float uGrain, uBars, uExposure, uContrast, uSaturation, uFade;
    uniform vec2  uResolution;
    uniform vec3  uStreakTint;
    varying vec2  vUv;

    float hash(vec2 p) {
      p = fract(p * vec2(443.897, 441.423));
      p += dot(p, p + 19.19);
      return fract(p.x * p.y);
    }

    /* Barrel distortion — real glass does not map straight lines straight. */
    vec2 distort(vec2 uv, float amt) {
      vec2 c = uv - 0.5;
      float r2 = dot(c, c);
      return 0.5 + c * (1.0 + amt * r2);
    }

    void main() {
      vec2 uv = vUv;
      vec2 c  = uv - 0.5;
      float r = length(c);

      /* --- chromatic aberration: each wavelength gets its own lens --- */
      float ca = uAberration * 0.0016 * (0.25 + r * r * 3.0);
      vec2 uvR = distort(uv, uDistortion * (1.0 + 0.010)) + c * ca;
      vec2 uvG = distort(uv, uDistortion);
      vec2 uvB = distort(uv, uDistortion * (1.0 - 0.010)) - c * ca;

      vec3 col;
      col.r = texture2D(tDiffuse, uvR).r;
      col.g = texture2D(tDiffuse, uvG).g;
      col.b = texture2D(tDiffuse, uvB).b;

      /* --- anamorphic streak: bright points smear horizontally --- */
      if (uStreak > 0.001) {
        vec3 streak = vec3(0.0);
        float total = 0.0;
        for (int i = -16; i <= 16; i++) {
          float fi = float(i);
          float w  = pow(1.0 - abs(fi) / 17.0, 2.0);
          vec3 s   = texture2D(tDiffuse, uvG + vec2(fi * 0.0085, 0.0)).rgb;
          float l  = dot(s, vec3(0.2126, 0.7152, 0.0722));
          streak  += s * smoothstep(0.62, 1.35, l) * w;
          total   += w;
        }
        col += (streak / total) * uStreakTint * uStreak;
      }

      col *= uExposure;

      /* --- film response: shoulder + toe, never a hard clip --- */
      col = col / (col + vec3(0.86)) * 1.86;
      col = mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, uSaturation);
      col = (col - 0.5) * uContrast + 0.5;

      /* --- split tone: cool shadows, warm highlights (classic grade) --- */
      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col += vec3(-0.012, 0.000, 0.030) * (1.0 - lum);
      col += vec3( 0.022, 0.008, -0.014) * lum;

      /* --- vignette --- */
      col *= mix(1.0, smoothstep(0.92, 0.22, r), uVignette);

      /* --- grain: strongest in the mids, as on real stock --- */
      float g = hash(gl_FragCoord.xy + fract(uTime) * 137.0) - 0.5;
      col += g * uGrain * (0.35 + 1.3 * lum * (1.0 - lum));

      col *= (1.0 - uFade);

      /* --- letterbox, drawn last so grain does not sit on the bars --- */
      float bar = step(uv.y, uBars) + step(1.0 - uBars, uv.y);
      col = mix(col, vec3(0.0), clamp(bar, 0.0, 1.0));

      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `,
};

export class Lens {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.camera = camera;

    /* Tone mapping is deferred to OutputPass so bloom happens in linear HDR,
       where it belongs. Blooming after tone mapping is what makes a scene
       look like a glow filter instead of a lens. */
    renderer.toneMapping = THREE.NoToneMapping;

    const size = renderer.getSize(new THREE.Vector2());

    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bokeh = new BokehPass(scene, camera, {
      focus: 20.0,
      aperture: 0.00075,
      maxblur: 0.012,
    });
    this.composer.addPass(this.bokeh);

    /* Threshold sits high on purpose: bloom is meant to be what a lens does
       to *highlights*, not a haze over the whole image. Drop the threshold
       and the blacks go milky, which is the single fastest way to make a
       real-time scene look cheap. */
    this.bloom = new UnrealBloomPass(size, 0.70, 0.70, 0.60);
    this.composer.addPass(this.bloom);

    const output = new OutputPass();
    output.toneMapping = THREE.ACESFilmicToneMapping;
    this.composer.addPass(output);

    this.final = new ShaderPass(FinalComposite);
    this.composer.addPass(this.final);

    this.u = this.final.uniforms;
    this.setSize(size.x, size.y);
  }

  /* --- the controls a director actually reaches for --- */
  set focus(v)      { this.bokeh.uniforms.focus.value = v; }
  get focus()       { return this.bokeh.uniforms.focus.value; }
  set aperture(v)   { this.bokeh.uniforms.aperture.value = v; }
  set maxBlur(v)    { this.bokeh.uniforms.maxblur.value = v; }
  set bloomStrength(v) { this.bloom.strength = v; }
  set bloomRadius(v)   { this.bloom.radius = v; }
  set bloomThreshold(v){ this.bloom.threshold = v; }
  set bars(v)       { this.u.uBars.value = v; }
  get bars()        { return this.u.uBars.value; }
  set fade(v)       { this.u.uFade.value = v; }
  set streak(v)     { this.u.uStreak.value = v; }
  set aberration(v) { this.u.uAberration.value = v; }
  set exposure(v)   { this.u.uExposure.value = v; }
  set grain(v)      { this.u.uGrain.value = v; }
  set vignette(v)   { this.u.uVignette.value = v; }

  setSize(w, h) {
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
    this.u.uResolution.value.set(w, h);
  }

  render(elapsed) {
    this.u.uTime.value = elapsed;
    this.composer.render();
  }
}
