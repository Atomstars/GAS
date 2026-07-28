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

  /* Two octaves, not four. This field is only ever used as a DISPLACEMENT, scaled
     by 0.24 — octaves 3 and 4 carry amplitude 1/8 and 1/16, so they displace by
     under a third of a pixel and cannot be seen, while costing a third of the
     shot's entire noise budget. Three layers x 13 noise evaluations per pixel made
     TITLE the most expensive frame in the film at 29.9ms, ahead of every project
     world. The density fbm below is where the detail actually lives. */
  vec2 w = vec2(
    fbm(vec3(uv * 1.9 + uSeed,        t), 2),
    fbm(vec3(uv * 1.9 + uSeed + 5.2,  t), 2)
  );
  vec2 puv = uv + w * 0.24 * freedom;

  // dispersal blows the field outward from centre
  puv += normalize(uv - 0.5 + 1e-5) * uDisperse * 0.35;

  // POINTER WAKE — the gas is genuinely pushed around by the cursor.
  vec2 toP = uv - uPointer;
  float pd = length(vec2(toP.x * uAspect, toP.y));
  float wake = exp(-pd * 5.0) * uPresence;
  puv += normalize(toP + 1e-5) * wake * 0.13;

  float d = fbm(vec3(puv * uScale, t * 1.7), 4) * 0.5 + 0.5;

  /* THE LETTERFORM AS AN ATTRACTOR, NOT A MASK.

     The old version multiplied the noise by a smoothstepped glyph mask. That is a
     clipping mask: it stamps a hard-edged letter out of a cloud texture, which is
     both the wrong image — the brief is gas CONDENSING INTO letters, not letters
     cut from gas — and the reason it read as a 2005 Photoshop effect. Every glyph
     edge was the mask's edge, perfectly sharp, with the turbulence sliding around
     underneath it.

     Here the field instead BIASES the density threshold. Gas near the glyph
     condenses at a lower threshold, so it thickens toward the letterform while the
     boundary is still drawn by the noise. The letters emerge out of the turbulence
     with edges made of gas, and wisps break off them. */
  float raw = texture2D(uField, uv).r;
  float live = uCond * (1.0 - uDisperse);

  /* CONDENSED CORE, TURBULENT BOUNDARY.

     Gas condensing does not become uniformly noisy — it becomes DENSE, and the
     turbulence survives only at the boundary where it is still mixing with the
     volume around it. Running the noise through the whole letterform (the obvious
     reading of "make the type out of gas") makes the letters look dirty and
     degraded rather than luminous; confining it to the edge is what actually reads
     as condensation, and it is the only way the core can carry any light.

     So: the noise displaces the attractor's BOUNDARY, weighted out of the core. */
  float coreness = smoothstep(0.50, 0.86, raw);
  float field = clamp(raw + (d - 0.5) * 0.46 * (1.0 - coreness), 0.0, 1.0);
  float attract = field * live;

  /* The unattracted threshold sets what the frame looks like BEFORE the wordmark
     exists, and the shot opens there: a volume full of gas that then gathers. At
     0.74 the opening frame measured pure black, so the condensation had nothing to
     condense out of and the whole premise was inverted. It can afford to be this
     low because the concentration gate below — not the threshold — is what clears
     the background once uCond arrives. */
  float thr = mix(0.50, 0.34, attract);
  float density = smoothstep(thr, thr + 0.38, d);

  // and the core stays dense regardless of the instantaneous noise — that is the
  // part which has finished condensing
  density = max(density, coreness * live);

  /* (b) and it concentrates the field. Threshold bias alone leaves the whole frame
     at ~30% density — measured meanLum 0.42, a flat blue fog with the letters
     barely in it. The old mask was crude but it was also where the blacks came
     from. So: uniform gas before the condensation, gas gathered into the wordmark
     after it, interpolated by uCond. That IS the condensation, and it keeps the
     frame mostly black, which is what makes it read as photographed. */
  density *= mix(1.0, smoothstep(0.06, 0.42, field), uCond);
  density *= (1.0 - uDisperse * 0.85);

  /* ONE KEY LIGHT (SHOTLIST §4.3).

     Screen-space derivatives of the density give a surface normal for free — no
     extra noise samples, which at 4 octaves apiece is the whole cost of the shot.
     Taken from a deliberately smoother quantity than the density itself, or the
     normal is pure noise and the lighting reads as static.

     (This shader lives in a JS template literal. Backticks in these comments
     terminate it and the file dies with a SyntaxError nowhere near the cause.) */
  float form = field * uCond + d * 0.55;
  vec3 n = normalize(vec3(dFdx(form) * 42.0, dFdy(form) * 42.0, 0.55));
  vec3 L = normalize(vec3(-0.55, 0.62, 0.56));
  float key = max(dot(n, L), 0.0);
  float rim = pow(1.0 - abs(n.z), 2.4);      // light wrapping the gas silhouette

  vec3 col = mix(uColA, uColB, d);
  col *= 0.22 + 0.92 * key;                  // form, instead of a flat fill
  col += uHot * rim * 0.26 * uCond;
  // only the genuinely thickest gas goes hot, or the whole wordmark clips white
  col += uHot * pow(density, 4.0) * 0.42 * uCond;
  // the wake glows as it displaces — the cursor lights the gas it disturbs
  col += uHot * wake * 0.85;
  density *= 1.0 - wake * 0.28;

  // additive: colour is premultiplied by density so bloom picks up the cores
  gl_FragColor = vec4(col * density * uOpacity, 1.0);
}
`;

/* Draw "GAS" and accumulate blurred copies into a smooth attractor field.

   Built at the VIEWPORT's aspect, and rebuilt when that changes. The field is
   sampled by the uv of a plane that exactly fills the frame, so a fixed 2:1 canvas
   was being squeezed into a 1.78:1 plane and every letter rendered at 89% of its
   true width — subtly wrong on a laptop, and on a portrait phone the wordmark
   would have been mangled. Sizing the glyph against canvas HEIGHT while the canvas
   matches the frame aspect makes a square glyph land square at any viewport.

   The type is also deliberately small. A wordmark that fills the frame edge to
   edge is a splash screen; a title is small, centred, and surrounded by air. */
function buildFieldTexture(text = 'GAS', aspect = 16 / 9) {
  const H = 720;
  const W = Math.max(256, Math.round(H * aspect));
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');

  x.fillStyle = '#000';
  x.fillRect(0, 0, W, H);

  // cap height at ~24% of frame height, but fit to width on narrow viewports
  const fs = Math.min(H * 0.24, W / 3.15);
  const draw = () => {
    x.font = `700 ${fs}px Syncopate, "Arial Black", sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillStyle = '#fff';
    x.letterSpacing = `${fs * 0.08}px`;
    // sits above centre — the lede and the scroll cue live in the lower half
    x.fillText(text, W / 2, H * 0.43);
  };

  x.globalCompositeOperation = 'lighter';
  /* Core plus progressively wider haloes — a cheap approximation of a distance
     field, and the gradient the gas condenses ALONG.

     Radii are a fraction of the CAP HEIGHT, not absolute pixels. As absolutes they
     were tuned against a wordmark filling the frame; once the type came down to a
     quarter of frame height the widest blur was 0.64 of the cap and the attractor
     degenerated into a smooth ellipse — so the shot rendered a soft glow blob
     behind clean letters, which is the "drop shadow" look, not gas. */
  const halo = [[0, 1.0], [0.02, 0.46], [0.06, 0.30], [0.14, 0.20], [0.28, 0.12]];
  for (const [k, alpha] of halo) {
    const blur = Math.round(k * fs);
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

/* Two layers, not three. Each is a full-screen 8-octave noise field and they were
   the single most expensive thing in the film — the third existed to fake volume
   that the key light in the fragment shader now produces properly.

   `scale` is up hard from 2.9/2.0. That was tuned when the wordmark filled the
   frame; at a quarter of frame height it put the noise features at roughly the
   size of the whole title, so the gas had no structure AT THE SCALE OF THE
   LETTERS and read as a flat wash behind them. Turbulence has to be finer than
   the thing it is condensing into or it cannot be seen doing it. */
const LAYERS = [
  { dist: 5.4, scale: 7.6, opacity: 0.58, seed: 0.0, hot: 0.55 },
  { dist: 7.4, scale: 5.2, opacity: 1.05, seed: 3.7, hot: 1.0 },
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
        /* 0.95 was the highest bloom in the film and it was what put a large soft
           ellipse behind the wordmark — the single thing that made this frame read
           as a cheap glow effect rather than a title. The mipmap bloom's kernel is
           enormous, so a small bright element on black smears into a lens-flare
           blob. The wordmark supplies its own rim light in-shader; it does not need
           the stack to halo it as well. */
        bloom: 0.52,
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

    this.fieldAspect = this.camera.aspect;
    this.field = buildFieldTexture('GAS', this.fieldAspect);
    // the webfont may land after first paint — rebuild once it is ready
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => this.rebuildField(true));
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

  /** The attractor is aspect-baked, so it has to follow the viewport. */
  rebuildField(force = false) {
    if (!this.layers) return;
    const a = this.camera.aspect;
    if (!force && Math.abs(a - this.fieldAspect) < 0.01) return;
    this.fieldAspect = a;
    const t = buildFieldTexture('GAS', a);
    for (const l of this.layers) l.material.uniforms.uField.value = t;
    this.field?.dispose();
    this.field = t;
  }

  setSize(w, h) {
    super.setSize(w, h);
    this.fitLayers();
    this.rebuildField();
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
