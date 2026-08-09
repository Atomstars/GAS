import * as THREE from 'three';
import { Shot } from '../core/ShotSystem.js';
import { textPlane, NO_HALO } from '../core/Text.js';
import { input } from '../core/Input.js';
import { ramp, hash } from '../core/math.js';
import { SIMPLEX3 } from '../core/noise.js';
import { beatCurve, stationAt, beatPresence, dwellDrift } from '../core/beat.js';
import { whipPan } from '../core/transitions/whipPan.js';

/* ACT I — THESIS.  Above the weather, at dawn.

   ── What this replaced, twice ──

   First it was 1px additive wireframe on a black clear colour: measured meanLum
   0.0127, with 96% of every frame literally black. Then it was a white gallery hall,
   which fixed the darkness and introduced a worse problem — an empty room is not a
   background. Both failed the same way: there was nothing in the frame that was doing
   anything.

   So the frame is now weather. The camera is flying above a cloud sea at first light,
   and EVERY layer of it is in motion independently of the scroll:

     · the cloud decks churn — domain-warped fbm evolving on its own clock, not a
       scrolling texture, so the shapes genuinely change rather than translate
     · the decks drift laterally at different speeds, so the parallax between them
       reads as distance
     · the sun's crepuscular rays rotate
     · the high stars parallax and twinkle
     · ice particulate streams through the light
     · the sky itself breathes between two dawn gradients

   That matters more than usual here because of R2: the camera comes to a full stop at
   every beat. A parked camera in a static world is a still image, and the reason
   SHOTLIST rule 12 exists. A parked camera in weather is a held shot. The stillness
   has to be the camera's alone. */

/* ── THE STATEMENT ──

   Rewritten from the first version, which opened on "I BUILD" and closed on "SIX OF
   THEM ARE BELOW" — the register of a student project: first-person, shouted, and
   referring to things the reader cannot see. R5 applies here too: every line names a
   specific technical claim a senior engineer could interrogate. */
const BEATS = [
  {
    kicker: '01 / THE WORK',
    head: ['Agents that reach', 'production'],
    sub: 'Pipelines wired into Jira, GitLab and the logs. The agent drafts the fix. An engineer reviews it and merges it.',
  },
  {
    kicker: '02 / THE METHOD',
    head: ['Whole systems,', 'not features'],
    sub: 'Data model, services, interface and the deploy path — designed together, by one person, end to end.',
  },
  {
    kicker: '03 / RETRIEVAL',
    head: ['Retrieval you can', 'depend on'],
    sub: 'Embeddings are easy to demo. A regression suite is what makes them safe to build a product on.',
  },
  {
    kicker: '04 / THE SEAM',
    head: ['Models assemble.', 'Engineers decide.'],
    sub: 'Context is expensive for a human and cheap for a model. Judgement is the reverse. Every pipeline here is drawn on that line.',
  },
  {
    kicker: '05 / WHAT FOLLOWS',
    head: ['Three builds,', 'in full'],
    sub: 'Problem, constraint, architecture, outcome — and the trade-off each one cost.',
  },
];

/* Beats sit on the flight line, spaced by this, with the camera parking READ_DIST
   short of each. TYPE_X puts them alternately left and right of the heading so the
   camera passes BESIDE the type rather than through it (HANDOFF trap 5), and the
   small turn between them is the whip-pan from R3. */
const GAP = 52;
const READ_DIST = 40;
const TYPE_X = 7.5;
const Z0 = -66;

/* Dawn, from above. Deep indigo overhead falling to a hot horizon — the whole point
   of putting the film up here is that this range is bright AND saturated, which is
   the thing neither previous version managed at the same time. */
const ZENITH = new THREE.Color(0x16225e);
const MIDSKY = new THREE.Color(0x5866bc);
const HORIZON = new THREE.Color(0xffa066);
const SUNCOL = new THREE.Color(0xffe9c2);
const CLOUD_LIT = new THREE.Color(0xffdcb0);
const CLOUD_DIM = new THREE.Color(0x4a5396);

/* Type is INK here, not light.

   The sky is the brightest thing in the film, so additive white type on it is white
   on white — the first pass of this set measured meanLum 0.74 with the headline
   barely separating from the cloud behind it. Deep indigo pigment against a dawn sky
   is both more legible and better looking: it reads as printed on the air rather than
   glowing in it, and it is the same ink the high-key work used. */
const INK = new THREE.Color(0x141a3c);

const skyVert = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/* The sky is a real gradient with a sun in it, not a background colour.

   Three bands rather than two: a straight zenith-to-horizon lerp gives the flat
   two-stop gradient that reads as a CSS background. The middle stop is what makes it
   look like atmosphere, because that is where the scattering actually turns over. */
const skyFrag = /* glsl */ `
precision highp float;
uniform vec3 uZenith, uMid, uHorizon, uSun;
uniform vec3 uSunDir;
uniform float uTime;
varying vec3 vDir;

void main(){
  vec3 d = normalize(vDir);
  float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);

  // breathe between a cooler and a warmer dawn so the sky is never twice the same
  float b = 0.5 + 0.5 * sin(uTime * 0.035);
  vec3 zen = mix(uZenith, uZenith * 1.18, b);

  vec3 c = mix(uHorizon, uMid, smoothstep(0.36, 0.54, h));
  // the zenith arrives EARLY, so the top of the frame is unmistakably deep blue and
  // the eye has somewhere dark to rest above the type
  c = mix(c, zen, smoothstep(0.48, 0.76, h));

  /* The aureole is TIGHT. At pow 5 it covered most of the sky and the whole frame
     read as one pale wash — the sun has to light the sky, not become it. */
  float s = max(dot(d, normalize(uSunDir)), 0.0);
  c += uSun * pow(s, 11.0) * 0.30;
  c += uSun * pow(s, 320.0) * 3.5;

  gl_FragColor = vec4(c, 1.0);
}
`;

const cloudVert = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/* Cloud density, domain-warped and evolving.

   The important line is the one that feeds uTime into the noise COORDINATE rather
   than offsetting the lookup: a scrolled texture translates, which the eye reads as a
   sliding image, while an evolving field billows. That difference is most of why the
   old title gas read as an oil slick.

   No backticks anywhere in this string. HANDOFF trap 8. */
const cloudFrag = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uSeed;
uniform float uScale;
uniform float uOpacity;
uniform float uSunSide;
uniform vec3 uLit;
uniform vec3 uDim;
uniform vec2 uRes;
uniform vec3 uWake[WAKE_N];      // xy = screen uv of a trail stamp, z = its remaining life
varying vec2 vUv;

${SIMPLEX3}

/* THE WAKE — the cursor clears the weather.

   A trail of recent pointer positions, each decaying, evaluated in SCREEN space so the
   effect cuts through every deck at once rather than per-billboard. Where the wake is
   strong the cloud density is scaled toward zero, so the layers part and the deep sky
   and stars behind them come through; as the stamps decay the cloud closes over again.

   Screen space is the whole point. Done per-plane in UV space it would smear with the
   plane and read as a texture artefact; done here it is a hole in the weather that
   stays put while the weather moves through it. */
float wakeAt(vec2 suv, float aspect){
  float clear = 0.0;
  for (int i = 0; i < WAKE_N; i++){
    vec2 d = (suv - uWake[i].xy) * vec2(aspect, 1.0);
    clear = max(clear, uWake[i].z * smoothstep(0.19, 0.0, length(d)));
  }
  return clear;
}

void main(){
  vec2 uv = (vUv - 0.5) * uScale;
  float t = uTime * 0.035 + uSeed;

  /* Warp at 0.65, not 1.15.

     A strong domain warp shears the field into ribbons, and the result reads as
     marbled paper rather than as weather — beautiful, but the wrong material. Enough
     warp to break the fbm's grid, not enough to smear it into swirls. */
  vec2 w = vec2(
    fbm(vec3(uv * 0.9, t), 2),
    fbm(vec3(uv * 0.9 + 5.2, t), 2)
  );
  float d = fbm(vec3(uv + w * 0.65, t * 0.7), 3);
  // tighter than the first pass: at 0.02-0.62 the decks were a haze with no form in
  // them, so the sky had nothing in it to fly between
  d = smoothstep(0.06, 0.44, d);

  /* Feather the plane to nothing at its edges. Without this every cloud is a
     rectangle with weather painted inside it, which is the single most obvious way a
     billboard gives itself away. */
  vec2 e = smoothstep(0.0, 0.34, vUv) * smoothstep(1.0, 0.66, vUv);
  d *= e.x * e.y;

  // and the pointer wipes it clear
  vec2 suv = gl_FragCoord.xy / uRes;
  d *= 1.0 - wakeAt(suv, uRes.x / uRes.y) * 0.92;
  if (d < 0.002) discard;

  /* Lit from one side only. A cloud shaded from its own density looks like smoke; a
     cloud shaded by where the sun IS looks like a cloud, and it ties every deck in
     the shot to the same key. */
  float lit = pow(clamp(0.5 + 0.5 * (vUv.x - 0.5) * 2.0 * uSunSide, 0.0, 1.0), 1.6);
  lit = mix(lit, 1.0, pow(d, 3.0) * 0.35);
  vec3 col = mix(uDim, uLit, lit);

  gl_FragColor = vec4(col, d * uOpacity);
}
`;

const DECKS = 15;

/* How many stamps the cursor trail carries.

   Eight is the fewest that still draws a continuous stroke at a normal mouse speed;
   each one costs a length() per fragment across every cloud plane the pixel is under,
   and this shot already has heavy transparent overdraw. Injected as a #define rather
   than a uniform so the loop unrolls. */
const WAKE_N = 8;

export class ThesisShot extends Shot {
  constructor() {
    super({
      id: 'thesis',
      label: 'WHAT I BUILD',
      /* 150 -> 340vh.

         This is why the act felt rushed, and it is arithmetic rather than taste. The
         gas cuts at either end take 22% of the shot each (see `clearP`), so 150vh left
         82vh of clear scroll for five beats — 16vh per beat, of which the dwell is 44%,
         i.e. SEVEN vh parked on a 20-word supporting line. Under a viewport-height in
         total for a whole beat.

         At 340 each beat gets ~37vh and each dwell ~16vh. The dwell budget is a SHARE
         of the shot, so the only way to buy reading time is to buy the shot more
         scroll — no amount of easing fixes a beat that is 16vh wide. */
      scrollVh: 340,
      key: 'mid',
      edgeColor: 0xffcc96,
      /* Bright and SATURATED. The previous two versions each managed one of those:
         the wireframe was saturated and black, the hall was bright and grey. A dawn
         sky is the one subject that is legitimately both.

         lift clears R4's 0.035 floor, contrast stays gentle because the sky supplies
         its own range, and the bloom threshold sits at 0.62 so the sun and the lit
         cloud tops blow out while the mid sky does not. */
      grade: {
        lift: [0.038, 0.036, 0.040],
        gamma: [1.0, 1.0, 1.02],
        gain: [1.05, 1.01, 1.0],
        sat: 1.14,
        contrast: 1.15,
        // only the sun's disc and the hottest cloud tops. At 0.62 the whole sky was
        // over the line and the HUGE kernel laid it back over itself as haze
        bloom: 0.36,
        bloomThreshold: 0.88,
        vignette: 0.32,
        vignetteOffset: 0.38,
        grain: 0.034,
      },
    });
  }

  build() {
    const S = this.scene;

    this.camera.fov = 38;
    this.camera.near = 0.5;
    this.camera.far = 3000;
    this.camera.rotation.order = 'YXZ';
    this.camera.updateProjectionMatrix();

    /* Low, and well off to the side. Head-on it filled the frame and blew the type
       off the screen; from the flank it rakes the cloud tops, which is the shot. */
    this.sunDir = new THREE.Vector3(-0.88, 0.10, -0.46).normalize();

    /* ---- sky ---- */
    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uZenith: { value: ZENITH.clone() },
        uMid: { value: MIDSKY.clone() },
        uHorizon: { value: HORIZON.clone() },
        uSun: { value: SUNCOL.clone() },
        uSunDir: { value: this.sunDir.clone() },
        uTime: { value: 0 },
      },
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 48, 32), this.skyMat);
    S.add(this.sky);

    /* ---- the sun, and its rays ----

       A bright disc plus long thin additive blades radiating from it. Crepuscular rays
       are a volumetric effect and doing them properly means a raymarch or a radial
       blur pass; a slowly counter-rotating fan of blades is neither, and at this
       distance behind the cloud decks it is indistinguishable from one. */
    const sunMat = new THREE.MeshBasicMaterial({ fog: false, transparent: true });
    sunMat.color.setRGB(3.4, 2.8, 2.0);            // above white, so it blooms — not so
    this.sun = new THREE.Mesh(new THREE.CircleGeometry(15, 48), sunMat);
    this.sun.position.copy(this.sunDir).multiplyScalar(1150);
    this.sun.lookAt(0, 0, 0);
    S.add(this.sun);

    /* Rays as SOFT blades.

       Flat planes at a flat opacity read as exactly what they are: rectangles. The
       shader below fades each one out along its length and across its width, so what
       reaches the frame is a gradient with no edge anywhere on it. Cheap enough to be
       worth doing properly rather than reaching for a radial-blur pass. */
    this.rays = new THREE.Group();
    this.rays.position.copy(this.sun.position);
    this.rays.quaternion.copy(this.sun.quaternion);
    const rayMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uCol: { value: new THREE.Color(0.95, 0.78, 0.55) }, uOpacity: { value: 0.055 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform vec3 uCol; uniform float uOpacity;
        varying vec2 vUv;
        void main(){
          float across = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x);
          float along = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.7);
          gl_FragColor = vec4(uCol, across * along * uOpacity);
        }`,
    });
    for (let i = 0; i < 9; i++) {
      const len = 340 + hash(i * 3.1) * 560;
      const blade = new THREE.Mesh(new THREE.PlaneGeometry(24 + hash(i) * 54, len), rayMat);
      blade.position.y = len / 2;
      const pivot = new THREE.Object3D();
      pivot.rotation.z = hash(i * 7.7) * Math.PI * 2;
      pivot.add(blade);
      this.rays.add(pivot);
    }
    S.add(this.rays);

    /* ---- POINTER PARALLAX RIGS ----

       Three groups, one per depth band, so the pointer moves the WORLD rather than the
       camera. That distinction is the whole trick: swinging the camera on the pointer
       drags the type across the frame while someone is reading it, which is why the
       parallax was damped almost to nothing during a dwell and the shot ended up
       feeling inert under the cursor. Move the layers instead, at rates set by their
       distance, and the sky opens up around stationary type.

       Near moves ~7x as far as far. That ratio is the effect. */
    this.rigNear = new THREE.Group();
    this.rigMid = new THREE.Group();
    this.rigFar = new THREE.Group();
    S.add(this.rigNear, this.rigMid, this.rigFar);

    /* ---- the cloud sea, and the decks we fly through ----

       One shader, cloned per deck so each carries its own seed, scale and drift. Same
       program either way, so the warm-up in main.js still compiles this once. */
    /* The wake and the resolution are SHARED uniform objects, deliberately.

       Every deck clones this material, and a clone deep-copies its uniforms — so
       without this the trail would have to be written into thirty-odd separate arrays
       every frame. Re-pointing the cloned material at the same object means the shot
       mutates one array and every cloud in the sky sees it. */
    this.uWake = { value: Array.from({ length: WAKE_N }, () => new THREE.Vector3(0, 0, 0)) };
    this.uRes = { value: new THREE.Vector2(this._w || 1280, this._h || 720) };

    const baseCloud = new THREE.ShaderMaterial({
      vertexShader: cloudVert,
      fragmentShader: cloudFrag,
      transparent: true,
      depthWrite: false,
      fog: false,
      defines: { WAKE_N },
      uniforms: {
        uTime: { value: 0 }, uSeed: { value: 0 }, uScale: { value: 3.0 },
        uOpacity: { value: 1 }, uSunSide: { value: -1 },
        uLit: { value: CLOUD_LIT.clone() }, uDim: { value: CLOUD_DIM.clone() },
        uWake: this.uWake, uRes: this.uRes,
      },
    });
    /** Clone that keeps the shared wake, rather than copying it. */
    const cloneCloud = () => {
      const m = baseCloud.clone();
      m.uniforms.uWake = this.uWake;
      m.uniforms.uRes = this.uRes;
      return m;
    };
    this._cloneCloud = cloneCloud;

    /* The trail itself: screen-space stamps with a life each, oldest first. */
    this.wake = Array.from({ length: WAKE_N }, () => ({ x: -9, y: -9, life: 0 }));
    this.wakeLast = { x: -9, y: -9 };

    // the floor of the world: a vast deck below the flight line, so there is always a
    // horizon and always a sense of altitude
    this.sea = [];
    for (let i = 0; i < 3; i++) {
      const m = cloneCloud();
      m.uniforms.uSeed.value = i * 4.3;
      m.uniforms.uScale.value = 5.2;
      m.uniforms.uOpacity.value = 0.92;
      m.uniforms.uSunSide.value = -1;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2600, 1500, 1, 1), m);
      mesh.rotation.x = -Math.PI / 2;
      // closer under the flight line than the first pass, so the deck reads as a
      // surface you are flying above rather than as a distant smudge
      const baseY = -30 - i * 14;
      mesh.position.set(0, baseY, -300 - i * 240);
      S.add(mesh);
      this.sea.push({ mesh, mat: m, drift: 4 + i * 2.5, baseY, phase: i * 2.1 });
    }

    // and the decks the camera actually flies between
    this.decks = [];
    this.deckSpan = DECKS * 34;
    for (let i = 0; i < DECKS; i++) {
      const m = cloneCloud();
      m.uniforms.uSeed.value = 11 + i * 2.7;
      m.uniforms.uScale.value = 2.2 + hash(i) * 2.4;
      m.uniforms.uOpacity.value = 0.44 + hash(i * 5.5) * 0.46;
      m.uniforms.uSunSide.value = -1;
      const w = 150 + hash(i * 2.2) * 190;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.52), m);
      mesh.position.set(
        (hash(i * 9.1) - 0.5) * 210,
        -34 + hash(i * 3.3) * 62,
        30 - i * 34,
      );
      mesh.renderOrder = -1;
      this.rigMid.add(mesh);
      this.decks.push({ mesh, mat: m, drift: 1.4 + hash(i * 6.6) * 3.6 });
    }

    /* ---- CIRRUS: the high layer ----

       Thin stretched streaks well above the flight line, drifting faster than anything
       below them. The stretch is free: the shader samples noise in UV space, so a
       400x54 plane gives a 7:1 horizontal smear without a second uniform.

       These are what stop the upper sky from being a flat gradient. A gradient with
       nothing in it is a background; a gradient with a layer moving across it at a
       different rate from the layer below is a sky. */
    this.cirrus = [];
    for (let i = 0; i < 6; i++) {
      const m = cloneCloud();
      m.uniforms.uSeed.value = 60 + i * 3.9;
      m.uniforms.uScale.value = 3.4 + hash(i * 1.9) * 2.0;
      m.uniforms.uOpacity.value = 0.20 + hash(i * 8.2) * 0.24;
      m.uniforms.uSunSide.value = -1;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(430, 54), m);
      mesh.position.set(
        (hash(i * 4.4) - 0.5) * 260,
        42 + hash(i * 2.6) * 46,
        -60 - i * 130,
      );
      mesh.rotation.z = (hash(i * 6.1) - 0.5) * 0.16;
      mesh.renderOrder = -2;
      this.rigFar.add(mesh);
      this.cirrus.push({ mesh, mat: m, drift: 5.5 + hash(i * 3.5) * 7 });
    }

    /* ---- WISPS: the near field ----

       The layer that actually sells speed and depth. Everything above is far enough
       away that the camera's 52-unit hop between beats barely moves it; these sit
       within a few units of the lens, so the same hop throws them clean across the
       frame. Parallax is not a decoration here, it is the only cue in a sky that says
       how fast you are going and how far away anything is.

       Kept soft and low-contrast on purpose — a sharp cloud passing the lens reads as
       a texture swipe. Low uScale means one or two large features per plane, which is
       what an out-of-focus foreground actually looks like. */
    this.wisps = [];
    this.wispSpan = 9 * 22;
    for (let i = 0; i < 9; i++) {
      const m = cloneCloud();
      m.uniforms.uSeed.value = 90 + i * 5.1;
      m.uniforms.uScale.value = 0.75 + hash(i * 2.4) * 0.6;
      m.uniforms.uOpacity.value = 0.16 + hash(i * 7.3) * 0.26;
      m.uniforms.uSunSide.value = -1;
      const w = 70 + hash(i * 1.6) * 60;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.62), m);
      mesh.position.set(
        (hash(i * 5.8) - 0.5) * 62,
        -14 + hash(i * 9.4) * 34,
        26 - i * 22,
      );
      /* No renderOrder override. Forcing these in front meant a wisp hazed the
         headline even when it was physically behind it; ordinary depth sorting lets a
         wisp cross the type only when it genuinely is nearer the lens, which is the
         shot, rather than a permanent veil, which is a bug. */
      this.rigNear.add(mesh);
      this.wisps.push({ mesh, mat: m, drift: 3 + hash(i * 4.1) * 6 });
    }

    /* ---- contrails ----
       Long thin lit streaks at altitude. Two of them, crossing, catching the key. They
       give the sky a horizon-independent sense of scale and one hard-edged element in
       a frame that is otherwise entirely soft. */
    const trailMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      // faint. At 0.3 two contrails read as scratches on the lens rather than as
      // aircraft twenty miles away, which is the only thing they are here to say
      uniforms: { uCol: { value: new THREE.Color(1.2, 1.05, 0.88) }, uOpacity: { value: 0.085 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform vec3 uCol; uniform float uOpacity;
        varying vec2 vUv;
        void main(){
          float core = smoothstep(0.0, 0.45, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
          float ends = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.62, vUv.x);
          gl_FragColor = vec4(uCol, core * ends * uOpacity);
        }`,
    });
    this.trails = [];
    for (let i = 0; i < 2; i++) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(560, 1.8), trailMat);
      mesh.position.set(-40 + i * 90, 72 + i * 26, -420 - i * 260);
      mesh.rotation.z = (i ? -1 : 1) * 0.12;
      mesh.renderOrder = -2;
      this.rigFar.add(mesh);
      this.trails.push({ mesh, drift: 2.2 + i * 1.6 });
    }

    /* ---- high stars, still visible at this hour ---- */
    const N = 420;
    const sp = new Float32Array(N * 3);
    const ss = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const a = hash(i) * Math.PI * 2;
      const y = 0.25 + hash(i * 1.7) * 0.72;
      const r = Math.sqrt(1 - y * y);
      sp.set([Math.cos(a) * r * 900, y * 900, Math.sin(a) * r * 900 - 300], i * 3);
      ss[i] = hash(i * 4.9);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    sg.setAttribute('seed', new THREE.BufferAttribute(ss, 1));
    this.starMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float seed;
        uniform float uTime;
        varying float vA;
        void main(){
          vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (0.6 + seed) + seed * 40.0));
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 1.4 + seed * 2.1;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main(){
          vec2 d = gl_PointCoord - 0.5;
          float m = smoothstep(0.5, 0.0, length(d));
          gl_FragColor = vec4(vec3(0.85, 0.90, 1.0) * m * vA, m * vA);
        }`,
    });
    S.add(new THREE.Points(sg, this.starMat));

    /* ---- ice particulate ----
       Fine crystals at this altitude, catching the key. Real points at real depths,
       which is what makes them parallax against the decks instead of sitting on the
       lens like a dirt overlay. */
    const P = 260;
    const pp = new Float32Array(P * 3);
    for (let i = 0; i < P; i++) {
      pp.set([
        (hash(i * 1.3) - 0.5) * 150,
        (hash(i * 2.9) - 0.5) * 90,
        30 - hash(i * 5.1) * 420,
      ], i * 3);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    this.motes = new THREE.Points(pg, new THREE.PointsMaterial({
      color: 0xfff0d8, size: 0.5, sizeAttenuation: true,
      transparent: true, opacity: 0.5, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false,
    }));
    S.add(this.motes);

    /* ---- the statement ----

       Type floats in the air with a lit rule under it. No plate, no board: the sky is
       the background and putting a panel in front of it would be covering up the one
       thing the shot is for. Additive again, because there is real depth behind it now
       for the light to sit against. */
    this.words = BEATS.map((B, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const g = new THREE.Group();
      g.position.set(side * TYPE_X, 2.2, Z0 - i * GAP);
      g.rotation.y = -side * Math.atan2(TYPE_X, READ_DIST) * 0.75;
      S.add(g);

      /* ---- EDITORIAL BLOCK, left-aligned off a rule ----

         Centred type is the layout you reach for when you cannot left-align, which
         until `padX` existed was literally the case here. The reference treatment is a
         spec sheet: a numbered chapter marker, a label, a hard vertical rule, and
         everything hanging off that rule at a single left margin. It reads as
         documentation of something rather than as a slogan about it. */
      const LEFT = -8.4;

      const kicker = textPlane(null, {
        paragraph: [B.kicker], height: 0.62, font: '"JetBrains Mono", ui-monospace, monospace',
        weight: 500, size: 34, tracking: 0.22, align: 'left',
        ink: true, halo: NO_HALO, color: 0x1e2350, hot: 0x8a4a20,
      });
      kicker.position.set(0, 5.0, 0);
      kicker.alignLeft(LEFT);
      kicker.setOpacity(0);
      g.add(kicker);

      /* The spine. One hard vertical the whole block hangs from — the only straight
         edge in a frame made entirely of weather, which is what makes the type read as
         placed rather than floating. */
      const spine = new THREE.Mesh(
        new THREE.PlaneGeometry(0.07, 9.4),
        new THREE.MeshBasicMaterial({
          color: 0x7a2f10, transparent: true, opacity: 0, depthWrite: false, fog: false,
        }),
      );
      spine.position.set(LEFT - 0.85, 0.9, 0);
      g.add(spine);

      /* Serif display, sentence case, at 400.

         All-caps grotesque at 700 was shouting — the same voice as the kicker and the
         body, only bigger, which is emphasis by volume rather than by contrast. A
         high-contrast serif in sentence case says the same words in a register a
         hiring engineer reads as considered. Tracking goes positive because a serif at
         display size needs air where a bold grotesque needs tightening. */
      const head = textPlane(null, {
        paragraph: B.head, height: 4.6, font: '"Instrument Serif", Georgia, serif',
        weight: 400, size: 120, tracking: 0.004, leading: 0.98, align: 'left',
        ink: true, halo: NO_HALO, color: INK.getHex(), hot: 0x7a2f10, wipeWidth: 0.05,
      });
      head.position.set(0, 1.7, 0);
      head.alignLeft(LEFT);
      head.setOpacity(0);
      g.add(head);

      const rule = new THREE.Mesh(
        new THREE.PlaneGeometry(9.2, 0.05),
        new THREE.MeshBasicMaterial({
          color: 0x2a2f5c, transparent: true, opacity: 0, depthWrite: false, fog: false,
        }),
      );
      rule.position.set(LEFT + 4.6, -1.15, 0);
      g.add(rule);

      /* Big enough to actually be read at the dwell distance.

         At height 2.2 a wrapped line came out at 2.6% of frame height — present in the
         frame, illegible in it, which is the same failure as having no supporting copy
         at all. A body line needs about 4.5% at this distance. */
      const sub = textPlane(null, {
        paragraph: wrap(B.sub, 38), height: 3.2, font: '"Space Grotesk", system-ui, sans-serif',
        weight: 400, size: 32, tracking: 0.006, leading: 1.52, align: 'left',
        ink: true, halo: NO_HALO, color: 0x1c2148, hot: 0x7a2f10,
      });
      sub.position.set(0, -3.1, 0);
      sub.alignLeft(LEFT);
      sub.setOpacity(0);
      g.add(sub);

      // keep the longest line inside a readable column whatever the copy becomes,
      // then re-hang it off the margin — scaling moves the block's centre
      for (const m of [head, sub]) {
        if (m.scale.x > 19) { m.scale.multiplyScalar(19 / m.scale.x); m.alignLeft(LEFT); }
      }

      return { group: g, kicker, head, rule, sub, spine, side };
    });

    this.stations = BEATS.map((_, i) => Z0 - i * GAP + READ_DIST);
    this.yaws = BEATS.map((_, i) => (i % 2 === 0 ? 1 : -1) * Math.atan2(TYPE_X, READ_DIST));
  }

  /* The composer owns the drawing-buffer size, and the wake is computed against
     gl_FragCoord, so the shot has to be told what the frame is. */
  setSize(w, h) {
    super.setSize(w, h);
    // setSize runs on every shot including unbuilt ones, so remember it either way —
    // a shot warmed after the last resize would otherwise carry the placeholder
    this._w = w;
    this._h = h;
    this.uRes?.value.set(w, h);
  }

  /* ---- THE CURSOR WAKE ----

     Stamp a new point when the pointer has moved far enough to need one, decay them
     all, and hand the array to the cloud shader. Distance-gated rather than time-gated:
     a stationary cursor should not keep burning a deeper and deeper hole in one spot,
     and a fast sweep should lay stamps close enough together to read as a stroke
     rather than as beads.

     `presence` gates the whole thing, so when the pointer leaves the window the sky
     closes over rather than keeping a hole open at the last known position. */
  updateWake(dt) {
    const x = input.ux;
    const y = input.uy;
    const moved = Math.hypot(x - this.wakeLast.x, y - this.wakeLast.y);

    if (moved > 0.012 && input.presence > 0.05) {
      this.wake.shift();
      this.wake.push({ x, y, life: 1 });
      this.wakeLast.x = x;
      this.wakeLast.y = y;
    }

    // heal over roughly two seconds, and faster once the pointer has gone
    const rate = 0.55 + (1 - input.presence) * 1.6;
    const arr = this.uWake.value;
    for (let i = 0; i < this.wake.length; i++) {
      const s = this.wake[i];
      s.life = Math.max(0, s.life - dt * rate);
      // squared, so a stamp holds its opening and then closes quickly rather than
      // fading linearly, which reads as a smudge rather than as air moving back in
      arr[i].set(s.x, s.y, s.life * s.life * input.presence);
    }
  }

  update(dt, t, localP) {
    /* Camera: segmented, paced, parked at each beat. core/beat.js. */
    const c = this.paceBeat(beatCurve(this.clearP(localP), 5, { hold: true }), dt);
    this.dwell = c.dwell;

    const z = stationAt(this.stations, c.u);

    const i0 = Math.max(0, Math.min(this.yaws.length - 1, Math.floor(c.u)));
    const i1 = Math.max(0, Math.min(this.yaws.length - 1, i0 + 1));
    const turn = Math.max(0, Math.min(1, c.u - i0));
    /* A real bank. At 0.045 the turn was a tripod head; an aircraft rolls into a turn
       and levels out of it, and because the horizon here is a cloud deck the roll is
       the most legible motion in the frame. It is zero at every dwell by construction,
       so the type is never read off-level. */
    const w = whipPan(turn, { yaw: 1, roll: 0.115 });
    const yaw = this.yaws[i0] + (this.yaws[i1] - this.yaws[i0]) * w.k;

    /* The flight line is not a rail.

       The camera eases toward whichever side the next beat is on, so the route through
       the sky curves instead of running dead straight down -Z. Driven off the station
       parameter, not the clock, so it is perfectly still during a dwell — the curve is
       something the camera DID, not something it is doing while parked. */
    const laneA = -this.yaws[i0] * 9;
    const laneB = -this.yaws[i1] * 9;
    const lane = laneA + (laneB - laneA) * w.k;

    const d = dwellDrift(t, 0.32);
    const swing = 1 + c.moving * 0.6;

    /* The camera barely responds to the pointer — a quarter of a unit — because it
       carries the type. The sky does the responding, below. */
    this.camera.position.set(
      lane + d.x * swing + input.px * 0.26,
      1.6 + d.y * swing * 0.8 + input.py * 0.18,
      z,
    );
    this.camera.rotation.y = yaw + d.x * 0.005;
    this.camera.rotation.x = 0.012 + d.y * 0.004;
    this.camera.rotation.z = d.roll + w.roll * (this.yaws[i1] > this.yaws[i0] ? 1 : -1)
      + input.px * 0.006;

    /* ---- the sky answers the pointer ----

       Three depth bands moving at 7:1, and unlike everything else here it does NOT
       damp during a dwell — a parked frame is exactly when the viewer has a free hand
       and nothing to do with it. The type does not move, so nothing being read moves;
       the weather around it does. */
    this.rigNear.position.set(input.px * -5.6, input.py * -3.4, 0);
    this.rigMid.position.set(input.px * -2.1, input.py * -1.3, 0);
    this.rigFar.position.set(input.px * -0.8, input.py * -0.5, 0);

    this.updateWake(dt);

    /* ---- the light moves through the act ----

       Dawn advances while you fly it. The sun climbs and swings a few degrees across
       the five beats, and because every cloud in the shot is shaded from uSunSide and
       the sky's aureole is anchored to uSunDir, that single vector re-lights the whole
       frame. Beat 1 and beat 5 are the same sky at different times of the morning,
       which is a thing a film can do and a background cannot. */
    const sunT = t * 0.012;
    this.sunDir.set(
      -0.88 + Math.sin(sunT) * 0.10,
      0.10 + (Math.sin(sunT * 0.7) * 0.5 + 0.5) * 0.09,
      -0.46 + Math.cos(sunT) * 0.06,
    ).normalize();
    this.skyMat.uniforms.uSunDir.value.copy(this.sunDir);

    // the sky and the sun ride with the camera so neither can ever be reached
    this.sky.position.set(this.camera.position.x, 0, z);
    this.sun.position.copy(this.sunDir).multiplyScalar(1150)
      .add(new THREE.Vector3(this.camera.position.x, 0, z));
    this.sun.lookAt(this.camera.position);
    this.rays.position.copy(this.sun.position);
    this.rays.quaternion.copy(this.sun.quaternion);

    /* ---- everything below here runs on the CLOCK, not on scroll ----

       This is the half that makes a parked camera a held shot rather than a freeze
       frame. None of it stops when the viewer does. */
    this.skyMat.uniforms.uTime.value = t;
    this.starMat.uniforms.uTime.value = t;

    for (const r of this.rays.children) r.rotation.z += dt * 0.008;

    /* The sun side is a live uniform, not a constant. As the key swings through the
       act, which face of every cloud is lit swings with it — one line, every deck. */
    const side = this.sunDir.x < 0 ? -1 : 1;

    for (const s of this.sea) {
      s.mat.uniforms.uTime.value = t;
      s.mat.uniforms.uSunSide.value = side;
      // a long slow swell, so the deck below is a moving surface rather than a mat
      s.mesh.position.x = Math.sin(t * 0.02) * s.drift * 3;
      s.mesh.position.y = s.baseY + Math.sin(t * 0.045 + s.phase) * 3.4;
    }

    // decks churn on their own clock, drift laterally, and recycle ahead of the lens
    // so the sky never runs out however far the route goes
    for (const k of this.decks) {
      k.mat.uniforms.uTime.value = t;
      k.mat.uniforms.uSunSide.value = side;
      k.mesh.position.x += dt * k.drift * 0.35;
      if (k.mesh.position.x > 150) k.mesh.position.x = -150;
      if (k.mesh.position.z > z + 46) k.mesh.position.z -= this.deckSpan;
      if (k.mesh.position.z < z - this.deckSpan) k.mesh.position.z += this.deckSpan;
    }

    // cirrus runs faster than everything under it — that rate difference IS the depth
    for (const k of this.cirrus) {
      k.mat.uniforms.uTime.value = t;
      k.mat.uniforms.uSunSide.value = side;
      k.mesh.position.x -= dt * k.drift;
      if (k.mesh.position.x < -300) k.mesh.position.x = 300;
    }

    /* Near-field wisps. They recycle against a much shorter span than the decks, so
       between two beats a wisp crosses the whole frame and is gone — which is the
       parallax that makes a 52-unit hop feel like distance covered. */
    for (const k of this.wisps) {
      k.mat.uniforms.uTime.value = t;
      k.mat.uniforms.uSunSide.value = side;
      k.mesh.position.x += dt * k.drift * 0.5;
      if (k.mesh.position.x > 46) k.mesh.position.x = -46;
      if (k.mesh.position.z > z + 20) k.mesh.position.z -= this.wispSpan;
      if (k.mesh.position.z < z - this.wispSpan) k.mesh.position.z += this.wispSpan;
    }

    for (const k of this.trails) k.mesh.position.x -= dt * k.drift;

    // motes stream past whether or not the camera is moving: at altitude the air is
    // going somewhere even when you are not
    this.motes.position.z = (this.motes.position.z + dt * 5.5) % 60;
    this.motes.position.x = Math.sin(t * 0.11) * 2.2;

    for (let i = 0; i < this.words.length; i++) {
      const b = beatPresence(c.u, i);
      const wd = this.words[i];
      wd.head.setOpacity(b.opacity);
      wd.head.setWipe(b.wipe);
      wd.kicker.setOpacity(b.opacity);
      wd.rule.material.opacity = b.opacity * 0.55;
      // the spine draws itself in first, ahead of the type it carries
      wd.spine.material.opacity = b.opacity * ramp(c.u - i, -0.9, -0.5) * 0.85;
      wd.sub.setOpacity(b.opacity * ramp(c.u - i, -0.42, -0.14) * 0.95);
    }
  }
}

/** Greedy wrap, so a supporting line is authored as prose and laid out as lines. */
function wrap(text, cols) {
  const out = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && (line + ' ' + word).length > cols) { out.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(line);
  return out;
}
