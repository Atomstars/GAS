import * as THREE from 'three';
import gsap from 'gsap';
import { Shot } from '../core/ShotSystem.js';
import { SIMPLEX3 } from '../core/noise.js';
import { input } from '../core/Input.js';

/* ACT 0 — TITLE.

   The wordmark is not drawn and it is not made of sprites. It is a real volumetric
   gas field: three parallax layers of domain-warped fbm, each scaled so they align
   in screen space, so the letterforms have genuine depth and the camera drifting
   sideways produces parallax INSIDE the type.

   `uCond` 0 -> 1 pulls the density field into the letterform attractor. That is the
   condensation. Nothing here is a blurred circle. */

const vert = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const frag = /* glsl */ `
precision highp float;

uniform sampler2D uField;
uniform float uCond;
uniform float uTime;
uniform float uScale;
uniform float uSeed;
uniform float uOpacity;
uniform float uDisperse;
uniform vec3  uColA;
uniform vec3  uColB;
uniform vec3  uHot;
uniform vec2  uPointer;
uniform float uPresence;
uniform float uAspect;

varying vec2 vUv;

${SIMPLEX3}

void main(){
  vec2 uv = vUv;
  float t = uTime * 0.045 + uSeed;

  // domain warp — the churn. suppressed as the gas condenses, released again
  // as it disperses into the transition.
  float freedom = mix(1.0, 0.16, uCond) + uDisperse * 1.4;

  vec2 w = vec2(
    fbm(vec3(uv * 1.9 + uSeed,        t), 4),
    fbm(vec3(uv * 1.9 + uSeed + 5.2,  t), 4)
  );
  vec2 puv = uv + w * 0.24 * freedom;

  // dispersal blows the field outward from centre
  puv += normalize(uv - 0.5 + 1e-5) * uDisperse * 0.35;

  // POINTER WAKE — the gas is genuinely pushed around by the cursor.
  vec2 toP = uv - uPointer;
  float pd = length(vec2(toP.x * uAspect, toP.y));
  float wake = exp(-pd * 5.0) * uPresence;
  puv += normalize(toP + 1e-5) * wake * 0.13;

  float d = fbm(vec3(puv * uScale, t * 1.7), 5) * 0.5 + 0.5;

  // the letterform attractor
  float field = texture2D(uField, uv).r;
  float m = mix(1.0, smoothstep(0.30, 0.74, field), uCond * (1.0 - uDisperse));

  float density = smoothstep(0.30, 0.80, d * m);
  density *= (1.0 - uDisperse * 0.85);

  vec3 col = mix(uColA, uColB, d);
  col += uHot * pow(density, 3.0) * 1.15 * uCond;
  // the wake glows as it displaces — the cursor lights the gas it disturbs
  col += uHot * wake * 0.85;
  density *= 1.0 - wake * 0.28;

  // additive: colour is premultiplied by density so bloom picks up the cores
  gl_FragColor = vec4(col * density * uOpacity, 1.0);
}
`;

/** Draw "GAS" and accumulate blurred copies into a smooth attractor field. */
function buildFieldTexture(text = 'GAS', W = 1024, H = 512) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');

  x.fillStyle = '#000';
  x.fillRect(0, 0, W, H);

  const draw = () => {
    const fs = Math.min(W / 2.55, H * 0.86);
    x.font = `700 ${fs}px Syncopate, "Arial Black", sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillStyle = '#fff';
    x.letterSpacing = `${fs * 0.06}px`;
    x.fillText(text, W / 2, H / 2 + fs * 0.04);
  };

  x.globalCompositeOperation = 'lighter';
  // core + progressively wider haloes -> smooth falloff around the glyphs
  for (const [blur, alpha] of [[0, 1.0], [3, 0.55], [9, 0.34], [20, 0.22], [38, 0.14]]) {
    x.filter = blur ? `blur(${blur}px)` : 'none';
    x.globalAlpha = alpha;
    draw();
  }
  x.filter = 'none';
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

const LAYERS = [
  { dist: 5.0, scale: 3.1, opacity: 0.55, seed: 0.0, hot: 0.55 },
  { dist: 7.0, scale: 2.2, opacity: 0.95, seed: 3.7, hot: 1.0 },
  { dist: 9.6, scale: 1.6, opacity: 0.50, seed: 8.1, hot: 0.35 },
];

export class TitleShot extends Shot {
  constructor() {
    super({
      id: 'title',
      label: 'GAS',
      scrollVh: 90,
      edgeColor: 0x9fd8ff,
      grade: {
        lift: [-0.008, -0.004, 0.010],
        gamma: [1.02, 1.0, 0.97],
        gain: [0.97, 1.0, 1.07],
        sat: 0.9,
        contrast: 1.14,
        bloom: 0.95,
      },
    });
    this.cond = 0;
    this.disperse = 0;
    this.revealed = false;
  }

  build() {
    this.camera.fov = 34;
    this.camera.position.set(0, 0, 0);
    this.camera.updateProjectionMatrix();

    this.field = buildFieldTexture();
    // the webfont may land after first paint — rebuild once it is ready
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        const t = buildFieldTexture();
        for (const l of this.layers) l.material.uniforms.uField.value = t;
        this.field.dispose();
        this.field = t;
      });
    }

    this.layers = LAYERS.map((L) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uField: { value: this.field },
          uCond: { value: 0 },
          uTime: { value: 0 },
          uScale: { value: L.scale },
          uSeed: { value: L.seed },
          uOpacity: { value: L.opacity },
          uDisperse: { value: 0 },
          uColA: { value: new THREE.Color(0x1d3a6b) },
          uColB: { value: new THREE.Color(0x7fc4ff) },
          uHot: { value: new THREE.Color(0.55, 0.78, 1.0).multiplyScalar(L.hot) },
          uPointer: { value: new THREE.Vector2(0.5, 0.5) },
          uPresence: { value: 0 },
          uAspect: { value: 1 },
        },
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      mesh.position.z = -L.dist;
      mesh.userData.dist = L.dist;
      mesh.renderOrder = 1;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      return mesh;
    });

    // a faint dust of far particulate so the void is never truly empty
    const N = 900;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 44;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 26;
      pos[i * 3 + 2] = -12 - Math.random() * 26;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({
      color: 0x6f9fd0, size: 0.03, transparent: true, opacity: 0.5,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    this.scene.add(this.dust);

    this.fitLayers();
  }

  /** Scale each layer so all three cover the viewport identically -> aligned type. */
  fitLayers() {
    if (!this.layers) return;
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    for (const mesh of this.layers) {
      const d = mesh.userData.dist;
      const h = 2 * Math.tan(vFov / 2) * d;
      mesh.scale.set(h * this.camera.aspect, h, 1);
    }
  }

  setSize(w, h) {
    super.setSize(w, h);
    this.fitLayers();
  }

  onEnter() {
    if (this.revealed) return;
    this.revealed = true;
    // the condensation plays on arrival — time-driven, not scroll-driven
    gsap.to(this, {
      cond: 1, duration: 3.4, delay: 0.5, ease: 'power2.inOut',
      onComplete: () => document.body.classList.add('title-in'),
    });
  }

  update(dt, t, localP) {
    // scroll pushes in and then releases the gas toward the transition
    const push = localP;
    this.disperse = Math.pow(THREE.MathUtils.clamp((localP - 0.55) / 0.45, 0, 1), 1.4);

    for (const mesh of this.layers) {
      const u = mesh.material.uniforms;
      u.uTime.value = t;
      u.uCond.value = this.cond;
      u.uDisperse.value = this.disperse;
      u.uPointer.value.set(input.ux, input.uy);
      u.uPresence.value = input.presence;
      u.uAspect.value = this.camera.aspect;
    }

    // ambient drift + POINTER PARALLAX. because the three gas layers sit at
    // different depths, moving the cursor shears them against each other and
    // the letterforms gain real volume.
    this.camera.position.x = Math.sin(t * 0.09) * 0.30 + input.px * 0.55;
    this.camera.position.y = Math.cos(t * 0.07) * 0.18 + input.py * 0.34;
    this.camera.position.z = push * 2.6;
    this.camera.lookAt(input.px * 0.22, input.py * 0.14, -6);

    this.dust.rotation.z = t * 0.006;
  }
}
