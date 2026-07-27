import * as THREE from 'three';
import { SIMPLEX_3D, FLOW_FIELD, FBM_3D } from '../shaders/noise.js';

/* ==================================================================
   FRAME 01 — GAS
   The old title was 2D gradient circles painted on a canvas. Those
   were the droplets. This is not that.

   ~180k points live on the GPU. Each one is permanently displaced by
   a turbulent flow field evaluated in the vertex shader, so the cloud
   genuinely churns like gas instead of orbiting in circles. The word
   GAS is a *target state* those same points are pulled toward — the
   letters are extruded in Z, so when the camera pushes in, the word
   has real thickness and parallax.

   Nothing here is clicked. The reveal is on a timeline, the exit is
   on the scroll.
================================================================== */

const TEXT = 'GAS';
const LETTER_WIDTH = 34;   // world units across
const EXTRUDE = 2.2;       // world units of Z thickness
const WORD_RISE = 2.8;     // sit the word above centre, leaving room for type
const BASE_DIST = 30;      // hero framing distance at P0

async function sampleText() {
  /* The letterforms have to be the real font, so wait for it. Sampling
     before the webfont lands silently gives you Arial. */
  try {
    await document.fonts.load('700 200px Syncopate');
    await document.fonts.ready;
  } catch { /* fall through to whatever is available */ }

  const W = 2048, H = 620;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });

  let fs = 420;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillStyle = '#fff';
  x.font = `700 ${fs}px Syncopate, sans-serif`;
  /* shrink to fit with margin */
  while (x.measureText(TEXT).width > W * 0.88 && fs > 40) {
    fs -= 8;
    x.font = `700 ${fs}px Syncopate, sans-serif`;
  }
  x.fillText(TEXT, W / 2, H / 2);

  const data = x.getImageData(0, 0, W, H).data;

  /* find the true ink bounds so the word centres on itself, not the canvas,
     and count the ink so the sampling stride can hit a particle budget */
  let minX = W, maxX = 0, minY = H, maxY = 0, ink = 0;
  for (let y = 0; y < H; y++) {
    for (let px = 0; px < W; px++) {
      if (data[(y * W + px) * 4 + 3] > 128) {
        ink++;
        if (px < minX) minX = px; if (px > maxX) maxX = px;
        if (y < minY) minY = y;   if (y > maxY) maxY = y;
      }
    }
  }
  return { data, W, H, minX, maxX, minY, maxY, ink };
}

export async function createTitleFrame({ scene, camera, rig, range: [P0, P1], maxParticles = 220000 }) {
  const group = new THREE.Group();
  scene.add(group);

  /* ================= volumetric nebula backdrop =================
     A sphere around the camera, not a plane in front of it. A plane
     has edges, and at any wide focal length you see them cut straight
     across the frame. Sampling 3D noise along the view direction also
     means the nebula has genuine depth in every direction instead of
     being wallpaper hung at a fixed distance.                        */
  const nebulaMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 1.0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: SIMPLEX_3D + FBM_3D + /* glsl */ `
      uniform float uTime, uIntensity;
      varying vec3 vDir;
      void main() {
        vec3 p = vDir * 2.15 + vec3(0.0, 0.0, uTime * 0.010);
        float n  = fbm(p);
        float n2 = fbm(p * 2.05 + n * 0.75);

        /* Hard shoulder on the density. Space is mostly empty — a nebula
           that covers the whole frame reads as a purple bedsheet, not as
           depth. Everything below the knee has to fall to true black. */
        float d = pow(smoothstep(0.02, 0.95, n2), 2.6);

        vec3 deep = vec3(0.015, 0.030, 0.110);
        vec3 viol = vec3(0.240, 0.070, 0.430);
        vec3 cyan = vec3(0.020, 0.330, 0.520);

        vec3 col = mix(deep, viol, d);
        col = mix(col, cyan, smoothstep(0.45, 1.0, n) * 0.55);

        /* thin the nebula out overhead and underfoot so the band of gas
           sits where the word does, and the frame keeps its black corners */
        float belt = pow(1.0 - abs(vDir.y), 1.15);

        gl_FragColor = vec4(col * d * belt * uIntensity, 1.0);
      }
    `,
  });
  const nebula = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 32), nebulaMat);
  nebula.renderOrder = -1000;
  nebula.frustumCulled = false;
  group.add(nebula);

  /* ===================== distant star field ===================== */
  const SN = 2600;
  const spos = new Float32Array(SN * 3);
  const ssz = new Float32Array(SN);
  for (let i = 0; i < SN; i++) {
    const r = 90 + Math.random() * 200;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    spos[i * 3]     = Math.sin(ph) * Math.cos(th) * r;
    spos[i * 3 + 1] = Math.cos(ph) * r * 0.6;
    spos[i * 3 + 2] = -40 - Math.abs(Math.sin(ph) * Math.sin(th) * r);
    ssz[i] = 0.5 + Math.random() * 2.2;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(spos, 3));
  starGeo.setAttribute('aScale', new THREE.BufferAttribute(ssz, 1));
  const starMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(devicePixelRatio, 2) }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aScale;
      uniform float uPixelRatio;
      varying float vT;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aScale * uPixelRatio * (90.0 / max(-mv.z, 0.001));
        vT = aScale;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uOpacity;
      varying float vT;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = dot(d, d) * 4.0;
        if (r > 1.0) discard;
        float a = pow(1.0 - r, 3.0);
        float tw = 0.75 + 0.25 * sin(uTime * 1.6 + vT * 9.0);
        gl_FragColor = vec4(vec3(0.75, 0.86, 1.0) * a * tw * uOpacity, a * uOpacity);
      }
    `,
  });
  group.add(new THREE.Points(starGeo, starMat));

  /* ================== the gas / the letterforms ================== */
  const { data, W, H, minX, maxX, minY, maxY, ink } = await sampleText();

  const inkW = Math.max(1, maxX - minX);
  const inkH = Math.max(1, maxY - minY);
  const scale = LETTER_WIDTH / inkW;
  const cxPx = (minX + maxX) / 2, cyPx = (minY + maxY) / 2;

  const LAYERS = 2;         // two Z samples per hit → real thickness
  const MAX = maxParticles;
  /* Stride from the *ink* area, not the bounding box — letterforms only
     fill about a fifth of their box, so sizing off the box undershoots the
     budget several times over and the word reads as loose beads. */
  const GAP = Math.max(1, Math.round(Math.sqrt((ink * LAYERS) / MAX)));

  const targets = [];
  outer:
  for (let y = minY; y <= maxY; y += GAP) {
    for (let px = minX; px <= maxX; px += GAP) {
      if (data[(y * W + px) * 4 + 3] < 128) continue;
      for (let l = 0; l < LAYERS; l++) {
        /* Bias Z toward the front and back faces so the word reads as a
           solid extruded slab rather than a fog of points. */
        const u = Math.random();
        const shell = Math.sign(u - 0.5) * Math.pow(Math.abs(u - 0.5) * 2, 0.45);
        targets.push(
          (px - cxPx) * scale + (Math.random() - 0.5) * GAP * scale,
          -(y - cyPx) * scale + (Math.random() - 0.5) * GAP * scale + WORD_RISE,
          shell * EXTRUDE * 0.5,
        );
        if (targets.length / 3 >= MAX) break outer;
      }
    }
  }

  const N = targets.length / 3;
  const aTarget = new Float32Array(targets);
  const aOrigin = new Float32Array(N * 3);
  const aSeed   = new Float32Array(N);
  const aScale  = new Float32Array(N);
  const aTint   = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    /* born in a wide, deep cloud that the camera starts *inside* */
    const r = 16 + Math.pow(Math.random(), 0.65) * 52;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    aOrigin[i * 3]     = Math.sin(ph) * Math.cos(th) * r;
    aOrigin[i * 3 + 1] = Math.cos(ph) * r * 0.62;
    aOrigin[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r * 0.85 - 6;

    aSeed[i]  = Math.random() * 100;
    aScale[i] = 0.55 + Math.pow(Math.random(), 2.2) * 2.6;
    /* tint by horizontal position so the word has a gradient across it */
    aTint[i]  = THREE.MathUtils.clamp(
      (aTarget[i * 3] / LETTER_WIDTH + 0.5) + (Math.random() - 0.5) * 0.35, 0, 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  geo.setAttribute('aTarget', new THREE.BufferAttribute(aTarget, 3));
  geo.setAttribute('aOrigin', new THREE.BufferAttribute(aOrigin, 3));
  geo.setAttribute('aSeed',   new THREE.BufferAttribute(aSeed, 1));
  geo.setAttribute('aScale',  new THREE.BufferAttribute(aScale, 1));
  geo.setAttribute('aTint',   new THREE.BufferAttribute(aTint, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 200);

  /* Additive blending accumulates: double the particles over the same
     letterforms and you double the light, so a budget change silently
     becomes an exposure change. Normalise brightness and point size
     against density so the frame is graded once and holds on a phone
     and a workstation alike. */
  const REF_DENSITY = 88000;
  const gain = THREE.MathUtils.clamp(REF_DENSITY / N, 0.16, 1.0);

  const gasMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uTime:       { value: 0 },
      uCondense:   { value: 0 },
      uDisperse:   { value: 0 },
      uFlow:       { value: 7.5 },
      uSize:       { value: 0.55 + 0.45 * Math.pow(gain, 0.4) },
      uOpacity:    { value: 1.0 },
      uGain:       { value: gain },
      uPixelRatio: { value: Math.min(devicePixelRatio, 2) },
    },
    vertexShader: SIMPLEX_3D + FLOW_FIELD + /* glsl */ `
      attribute vec3  aTarget;
      attribute vec3  aOrigin;
      attribute float aSeed;
      attribute float aScale;
      attribute float aTint;

      uniform float uTime, uCondense, uDisperse, uFlow, uSize, uPixelRatio;

      varying float vTint;
      varying float vGlow;
      varying float vDepth;

      void main() {
        float t = uTime;

        /* ---- gas state: turbulent, and slowly rotating as a whole ---- */
        vec3 gp = aOrigin;
        gp += flowField(aOrigin * 0.055 + aSeed * 0.008, t * 0.035) * uFlow;

        float ang = t * 0.045 + length(aOrigin.xz) * 0.010;
        float ca = cos(ang), sa = sin(ang);
        gp.xz = mat2(ca, -sa, sa, ca) * gp.xz;

        /* ---- condensed state: the letterform, still breathing ---- */
        vec3 tp = aTarget;
        tp += flowField(aTarget * 0.42 + aSeed * 0.05, t * 0.10) * 0.165;

        vec3 pos = mix(gp, tp, uCondense);

        /* ---- exit: blown apart and past the camera ---- */
        if (uDisperse > 0.0) {
          vec3 dir = normalize(vec3(aTarget.xy, 0.0) + vec3(aSeed * 0.13 - 6.5, aSeed * 0.09 - 4.5, 2.0));
          float d = uDisperse * uDisperse;
          pos += dir * d * 46.0;
          pos.z += d * 34.0;
        }

        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;
        /* Gas is volume; a letterform is detail. Points start large and
           soft so the cloud reads as something you are inside of, then
           tighten as they condense — same particles, different substance.
           Clamped, because a point drifting up to the lens would otherwise
           scale to cover the screen, and 200k of those is a fill-rate
           cliff, not a look. */
        float sizeMul = mix(3.4, 1.0, uCondense);
        gl_PointSize = clamp(
          aScale * uSize * sizeMul * uPixelRatio * (58.0 / max(-mv.z, 0.001)),
          0.0, 34.0 * uPixelRatio);

        vTint  = aTint;
        vGlow  = uCondense;
        vDepth = aTarget.z;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity, uGain;
      varying float vTint;
      varying float vGlow;
      varying float vDepth;

      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = dot(d, d) * 4.0;
        if (r > 1.0) discard;
        /* wide, soft falloff while it is gas; tight while it is a letter */
        float a = pow(1.0 - r, mix(1.15, 2.5, vGlow));

        vec3 cool = vec3(0.10, 0.70, 1.00);
        vec3 mid  = vec3(0.46, 0.34, 1.00);
        vec3 hot  = vec3(1.00, 0.26, 0.78);

        vec3 col = vTint < 0.5
          ? mix(cool, mid, vTint * 2.0)
          : mix(mid,  hot, (vTint - 0.5) * 2.0);

        /* front faces of the extrusion catch more light than the back —
           cheap, but it is what sells the word as a solid object */
        col *= 0.72 + 0.42 * smoothstep(-1.2, 1.2, vDepth);

        /* condensed points burn toward white at their cores — kept low so
           the cyan→magenta gradient across the word survives the bloom */
        col = mix(col, vec3(1.0, 0.96, 0.93), vGlow * 0.42 * pow(1.0 - r, 3.5));

        /* big soft points overlap far more, so the gas state needs much
           less energy per point to sit at the same exposure */
        float o = a * uOpacity * uGain * mix(0.20, 1.0, vGlow);
        gl_FragColor = vec4(col * o, o);
      }
    `,
  });

  const gas = new THREE.Points(geo, gasMat);
  group.add(gas);

  /* ================== camera: one continuous push ==================
     P0 is already the hero framing — the word is at its best composition
     the moment it forms. The flight *into* that framing happens on the
     reveal clock below, so the viewer's first second is a camera move,
     not a static card waiting to be scrolled.                          */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const lerpP = k => P0 + (P1 - P0) * k;
  rig
    .key(P0,         { pos: V(0, 0.3, 30),   look: V(0, 0, -2),  roll: -0.022, fov: 48, focus: 30 })
    .key(lerpP(0.34),{ pos: V(1.1, 0.7, 25), look: V(0, 0, -1),  roll: -0.010, fov: 47, focus: 26 })
    .key(lerpP(0.66),{ pos: V(-0.7, 0.1, 18),look: V(0, 0, 0),   roll:  0.008, fov: 45, focus: 19, hold: true })
    .key(P1,         { pos: V(0, -0.5, 4),   look: V(0, 0, -26), roll:  0.026, fov: 60, focus: 13 });

  /* ---------------------------------------------------------------
     The reveal is on a clock, not on the scroll: the viewer arrives,
     the gas finds the word, and only then are they invited to travel.
  --------------------------------------------------------------- */
  let condense = 0, revealT = 0, revealing = false;
  const REVEAL_DELAY = 1.1, REVEAL_DUR = 4.2;
  const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  return {
    group,
    /* fires once the word is legible — main.js uses it to bring in type */
    onFormed: null,
    _fired: false,

    update(P, dt, t) {
      nebulaMat.uniforms.uTime.value = t;
      starMat.uniforms.uTime.value = t;
      gasMat.uniforms.uTime.value = t;

      /* the nebula travels with the lens, so it can never be reached */
      nebula.position.copy(camera.position);

      /* --- timed condensation --- */
      revealT += dt;
      if (revealT > REVEAL_DELAY) {
        revealing = true;
        condense = Math.min(1, (revealT - REVEAL_DELAY) / REVEAL_DUR);
      }
      const c = easeInOut(condense);
      gasMat.uniforms.uCondense.value = c;
      /* turbulence calms as the word forms, then never fully stops */
      gasMat.uniforms.uFlow.value = 7.5 * (1 - c * 0.86);

      /* --- the opening move: we fly in through the cloud while it
             condenses, on a long focal length that widens as we settle --- */
      const settle = 1 - c;
      rig.fovOffset = settle * 13;

      /* --- responsive framing: hold the word inside the frame on any
             aspect. A fixed camera distance is fine at 16:9 and throws
             the title straight off the edges on a narrow window. --- */
      const local0 = THREE.MathUtils.clamp((P - P0) / (P1 - P0), 0, 1);
      const halfFov = THREE.MathUtils.degToRad(camera.fov * 0.5);
      const needed = (LETTER_WIDTH * 0.64) / (Math.tan(halfFov) * camera.aspect);
      /* taper the correction away as we start travelling — past the hero
         beat the camera is meant to push through the letters */
      const fit = Math.max(0, needed - BASE_DIST) * (1 - THREE.MathUtils.smoothstep(local0, 0.0, 0.5));

      rig.offset.z = settle * 30 + fit;
      rig.offset.y = settle * 1.6;

      if (!this._fired && c > 0.55) { this._fired = true; this.onFormed?.(); }

      /* --- exit: the word comes apart as you begin to travel --- */
      const local = THREE.MathUtils.clamp((P - P0) / (P1 - P0), 0, 1);
      const out = THREE.MathUtils.smoothstep(local, 0.55, 1.0);
      gasMat.uniforms.uDisperse.value = out;
      gasMat.uniforms.uOpacity.value = 1 - out * 0.75;

      nebulaMat.uniforms.uIntensity.value = 0.85 * (1 - out * 0.45);
      starMat.uniforms.uOpacity.value = 1;

      group.visible = local < 0.999 || P < P1 + 0.02;
    },

    setPixelRatio(pr) {
      gasMat.uniforms.uPixelRatio.value = pr;
      starMat.uniforms.uPixelRatio.value = pr;
    },

    /* jump the timed reveal to an arbitrary point — used for grading the
       look at a fixed moment instead of waiting out the timeline */
    seekReveal(v) { revealT = REVEAL_DELAY + THREE.MathUtils.clamp(v, 0, 1) * REVEAL_DUR; },

    get particleCount() { return N; },
  };
}
