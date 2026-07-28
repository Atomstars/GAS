import * as THREE from 'three';
import { Shot } from '../core/ShotSystem.js';
import { SIMPLEX3 } from '../core/noise.js';
import { textPlane, TIGHT_HALO } from '../core/Text.js';
import { input } from '../core/Input.js';
import { PROJECTS } from '../data/projects.js';
import { ramp, lramp, hash } from '../core/math.js';

/* ACT III — CONTACT.  SHOTLIST.md §3: "The gas disperses. Contact resolves out of it."

   THE TERMINUS. Every other shot has been a passage through something. This one is
   arrival, and it has to earn being the last thing a prospective client sees.

   Three things carry it:

   1. MATCH CUT. GMAT ends holding on the conclusion inside a corridor whose walls
      stand at x = ±15.5 with rules running to a vanishing point. CONTACT opens on
      two rails at exactly that gauge, converging to exactly that point — the gas
      carries the shape across, per SHOTLIST §2, "never cut on nothing". Then the
      rails SPREAD: the corridor that the whole film has been travelling down opens
      out, which is the one move no earlier shot makes.

   2. THE ROUTE, BEHIND YOU. Six numbered stops recede along the rails — the work
      just flown, laid out as one line. The rail in the DOM says the same thing
      about the journey; here it is the subject of the frame rather than chrome on
      the edge of it.

   3. THE GAS ACTUALLY DISPERSES. The old version of this shot churned the same
      fbm bed forever, which is why it read as a holding pattern. Here density
      falls and lifts out of frame over the shot, and what it uncovers is a clear
      horizon — Akash, the sky. The brand's own etymology is the closing image. */

/* Screen position under perspective goes as 1/z, so evenly spaced DEPTHS bunch
   almost every stop against the vanishing point. Spacing evenly in 1/z instead
   spreads the six evenly across the frame, which is the only way the route reads
   as six stops rather than as a smear with one legible numeral at the near end. */
const Z_NEAR = 100;
const Z_FAR = 300;
const STOPS = PROJECTS.map((p, i) => {
  const k = i / (PROJECTS.length - 1);
  const inv = (1 / Z_NEAR) + ((1 / Z_FAR) - (1 / Z_NEAR)) * k;
  return { n: String(p.index).padStart(2, '0'), accent: p.accent, z: -1 / inv };
});

/* The gauge GMAT's corridor walls stand at. The cut rhymes only if this matches. */
const GAUGE = 15.5;

/* The route runs well BELOW the lens, not at eye level. At eye level the ground
   plane is edge-on, so every cross-tie projects onto the same scanline and the six
   stops read as a stack of coloured bars rather than as a road running away from
   you — which is exactly what the first cut of this shot did. The drop is what
   buys the vertical separation that makes the recession legible. */
const RAIL_Y = -20;
const HORIZON_Z = -430;

const vert = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/* The dispersing bed. uDisperse 0 -> 1 thins it, lifts it and coarsens it, so the
   frame CLEARS instead of settling into a loop. */
const frag = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uScale;
uniform float uSeed;
uniform float uOpacity;
uniform float uDisperse;
uniform vec3  uColA;
uniform vec3  uColB;
varying vec2 vUv;

${SIMPLEX3}

void main(){
  vec2 uv = vUv;
  float t = uTime * 0.03 + uSeed;

  // as it disperses the bed also drifts upward out of frame
  uv.y -= uDisperse * 0.42;

  // displacement only — see the note in TitleShot; the high octaves here move the
  // sample by a fraction of a pixel and cost a third of the shot's noise budget
  vec2 w = vec2(
    fbm(vec3(uv * 1.6 + uSeed, t), 2),
    fbm(vec3(uv * 1.6 + uSeed + 4.1, t), 2)
  );
  float scale = uScale * (1.0 - uDisperse * 0.45);   // coarser as it thins
  float d = fbm(vec3((uv + w * 0.30) * scale, t * 1.3), 4) * 0.5 + 0.5;

  // sit low in frame and clear the upper two thirds for the type
  float band = smoothstep(-0.15, 0.42, uv.y) * (1.0 - smoothstep(0.30, 0.92, uv.y));
  float density = smoothstep(0.34 + uDisperse * 0.22, 0.86, d) * (0.10 + band * 0.78);

  vec3 col = mix(uColA, uColB, d);
  // all the way to nothing: the shot's premise is that the gas CLEARS, and a
  // residual 18% haze both undercuts that and keeps two full-screen noise passes
  // alive for the whole back half of the shot
  float fade = 1.0 - uDisperse;
  gl_FragColor = vec4(col * density * uOpacity * fade, 1.0);
}
`;

/* The horizon the gas uncovers: a hard emissive line with a soft bloom shoulder,
   brightest at centre. Real geometry, not a radial sprite (SHOTLIST §4.5). */
const horizonFrag = /* glsl */ `
precision highp float;
uniform float uIgnite;
uniform vec3  uColor;
varying vec2 vUv;

void main(){
  // vertical: a thin core inside a wide shoulder
  float d = abs(vUv.y - 0.5) * 2.0;
  float core     = pow(1.0 - clamp(d * 12.0, 0.0, 1.0), 2.0);
  float shoulder = pow(1.0 - d, 3.0) * 0.30;

  // horizontal: ignites at the vanishing point and runs outward along the line
  float x = abs(vUv.x - 0.5) * 2.0;
  float reach = smoothstep(uIgnite * 1.25 + 0.04, uIgnite * 1.25 - 0.22, x);
  float ends = 1.0 - smoothstep(0.55, 1.0, x);

  float v = (core + shoulder) * reach * ends * uIgnite;
  gl_FragColor = vec4(uColor * v, 1.0);
}
`;

export class ContactShot extends Shot {
  constructor() {
    super({
      id: 'contact',
      label: 'CONTACT',
      scrollVh: 90,
      edgeColor: 0x9fd8ff,
      grade: {
        lift: [-0.006, -0.002, 0.010],
        gamma: [1.02, 1.0, 0.98],
        gain: [0.98, 1.0, 1.05],
        sat: 0.88,
        contrast: 1.1,
        // the closing image is a bright line against black, and the stack default
        // turns that into a haze across the type sitting above it
        bloom: 0.62,
      },
    });
  }

  build() {
    const S = this.scene;

    this.camera.fov = 34;
    this.camera.near = 0.5;
    this.camera.far = 1200;
    this.camera.position.set(0, 0, 0);
    this.camera.updateProjectionMatrix();

    /* ---- the dispersing bed ---- */
    /* Kept low. This bed is at FULL strength at localP 0, which is precisely the
       midpoint of the incoming gas transition, and GMAT on the other side of that
       cut is near-white type. At the old strength the two summed to meanLum 0.214
       with 12% of the frame past the highlight clip — a white mush with neither
       world's shape visible, against 0.004-0.071 for every other cut in the film. */
    this.layers = [
      { dist: 6.0, scale: 2.6, opacity: 0.24, seed: 1.3 },
      { dist: 9.0, scale: 1.7, opacity: 0.31, seed: 6.9 },
    ].map((L) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: vert, fragmentShader: frag,
        transparent: true, depthWrite: false, depthTest: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uScale: { value: L.scale },
          uSeed: { value: L.seed },
          uOpacity: { value: L.opacity },
          uDisperse: { value: 0 },
          uColA: { value: new THREE.Color(0x15294a) },
          uColB: { value: new THREE.Color(0x6fb6ff) },
        },
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      m.position.z = -L.dist;
      m.userData.dist = L.dist;
      m.frustumCulled = false;
      m.renderOrder = -10;             // behind the structure
      S.add(m);
      return m;
    });

    /* ---- the rails: GMAT's corridor gauge, opening out ---- */
    this.railGeo = new THREE.BufferGeometry();
    this.railPts = new Float32Array(4 * 3);      // two lines, two points each
    this.railGeo.setAttribute('position', new THREE.BufferAttribute(this.railPts, 3));
    this.railMat = new THREE.LineBasicMaterial({
      color: 0x63b8e8, transparent: true, opacity: 0.55,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.rails = new THREE.LineSegments(this.railGeo, this.railMat);
    this.rails.frustumCulled = false;
    S.add(this.rails);

    /* ---- the six stops, receding ---- */
    this.stops = STOPS.map((s) => {
      const g = new THREE.Group();

      // cross-tie between the rails
      const tieGeo = new THREE.BufferGeometry();
      const tiePts = new Float32Array(6);
      tieGeo.setAttribute('position', new THREE.BufferAttribute(tiePts, 3));
      const tie = new THREE.LineSegments(tieGeo, new THREE.LineBasicMaterial({
        color: s.accent, transparent: true, opacity: 0.5,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      tie.frustumCulled = false;
      g.add(tie);

      /* Scaled with distance so every numeral holds the same screen size, and
         offset above the rail by a fraction of that size so it sits a constant
         distance above the line. Anchoring it at a FIXED screen offset instead
         would put all six at the same point on the frame — they only spread
         because the rail they hang off converges. */
      const h = Math.abs(s.z) * 0.048;
      const num = textPlane(s.n, {
        height: h,
        font: '"JetBrains Mono", ui-monospace, monospace',
        weight: 500,
        size: 72,
        tracking: 0.16,
        color: s.accent,
        hot: 0xeaf8ff,
        // small in frame: tight halo and low glow, or the counters close up and
        // the digits resolve as blobs
        halo: TIGHT_HALO,
        glow: 0.22,
      });
      // x is set per frame against the moving rail (see update) — pinning it to a
      // fixed world x leaves the six in a near-vertical column that overlaps into
      // an unreadable blur at the far end
      num.position.set(0, RAIL_Y + h * 0.8, s.z);
      num.setOpacity(0);
      g.add(num);

      S.add(g);
      return { spec: s, tie, tiePts, tieGeo, num, h };
    });

    /* ---- the horizon the gas uncovers ---- */
    const hMat = new THREE.ShaderMaterial({
      vertexShader: vert, fragmentShader: horizonFrag,
      transparent: true, depthWrite: false, depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uIgnite: { value: 0 },
        uColor: { value: new THREE.Color(0xbfe6ff) },
      },
    });
    this.horizon = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), hMat);
    this.horizon.scale.set(760, 46, 1);
    this.horizon.position.set(0, RAIL_Y, HORIZON_Z);
    this.horizon.frustumCulled = false;
    S.add(this.horizon);

    /* ---- particulate, lifting away ---- */
    const N = 1200;
    const pos = new Float32Array(N * 3);
    this.dustSeed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos.set([
        (hash(i * 3 + 1) - 0.5) * 90,
        (hash(i * 3 + 2) - 0.5) * 34,
        -6 - hash(i * 3 + 3) * 120,
      ], i * 3);
      this.dustSeed[i] = hash(i * 7 + 5);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({
      color: 0x8fb8e6, size: 0.035, transparent: true, opacity: 0.6,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    this.dust.frustumCulled = false;
    S.add(this.dust);

    this.fit();
  }

  fit() {
    if (!this.layers) return;
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    for (const m of this.layers) {
      const h = 2 * Math.tan(vFov / 2) * m.userData.dist;
      m.scale.set(h * this.camera.aspect, h, 1);
    }
  }

  setSize(w, h) { super.setSize(w, h); this.fit(); }

  update(dt, t, localP) {
    /* The shot is one move: arrive, then let it open. Held slightly late so the
       incoming gas transition lands on the matched corridor gauge, not on a frame
       that has already started spreading. */
    const open = ramp(localP, 0.16, 0.92);
    // clears early: the bed is the thing standing between the viewer and the
    // structure, and the structure is the reason the shot exists
    const disperse = ramp(localP, 0.02, 0.66);

    /* Once the bed has fully dispersed it contributes nothing, so stop shading it.
       These are two FULL-SCREEN noise passes and they were the reason CONTACT cost
       23ms — more than any project world — for a back half in which they are
       invisible. Culling is exact here, not an approximation: fade reaches 0. */
    const bedVisible = disperse < 0.999;
    for (const m of this.layers) {
      m.visible = bedVisible;
      if (!bedVisible) continue;
      m.material.uniforms.uTime.value = t;
      m.material.uniforms.uDisperse.value = disperse;
    }

    // camera lifts as the route opens out — the sky is uncovered by rising into it
    this.camera.position.set(
      Math.sin(t * 0.07) * 0.3 + input.px * 1.2,
      open * 3.2 + input.py * 0.5,
      0,
    );
    // held level: the far line only sits low in frame while the lens stays flat,
    // and tilting down would drag the horizon back to the middle of the frame
    this.camera.lookAt(
      Math.sin(t * 0.05) * 0.6,
      this.camera.position.y + 0.2,
      -60,
    );
    this.camera.rotation.z = Math.sin(t * 0.11) * 0.004;

    /* Rails: start at GMAT's gauge, spread as the route opens out.

       Narrowed on narrow viewports. Horizontal extent scales with aspect but the
       vertical FOV does not, so on a portrait phone the full-width gauge puts the
       near half of the road outside the frame and the route reads as two stray
       ticks near the horizon. */
    const aspectK = Math.min(1, this.camera.aspect / 1.78);
    const gauge = (GAUGE + open * open * 26) * aspectK;
    const zNear = 12;
    this.railPts.set([
      -gauge, RAIL_Y, zNear, -gauge, RAIL_Y, HORIZON_Z,
      gauge, RAIL_Y, zNear, gauge, RAIL_Y, HORIZON_Z,
    ]);
    this.railGeo.attributes.position.needsUpdate = true;
    this.railMat.opacity = 0.55 * (1 - open * 0.55);

    /* the stops light in order as the route is read back, nearest first */
    for (let i = 0; i < this.stops.length; i++) {
      const s = this.stops[i];
      s.tiePts.set([-gauge, RAIL_Y, s.spec.z, gauge, RAIL_Y, s.spec.z]);
      s.tieGeo.attributes.position.needsUpdate = true;

      // ride just inside the left rail, so the numerals inherit the rail's
      // convergence and run as a diagonal rather than piling up on one column
      s.num.position.x = -gauge + s.h * 1.15;

      // read back along the route: near stop first, far stop last
      const k = i / (this.stops.length - 1);
      const lit = ramp(localP, 0.14 + k * 0.42, 0.30 + k * 0.42);
      const hold = 1 - ramp(localP, 0.88, 1.0) * 0.5;
      s.tie.material.opacity = 0.5 * lit * hold;
      s.num.setOpacity(lit * hold * 0.9);
    }

    /* the horizon ignites out of the vanishing point as the bed clears */
    this.horizon.material.uniforms.uIgnite.value = ramp(localP, 0.34, 0.95);

    /* dust lifts and thins — the gas leaving frame */
    const p = this.dust.geometry.attributes.position;
    for (let i = 0; i < this.dustSeed.length; i++) {
      const y = p.array[i * 3 + 1] + dt * (0.22 + this.dustSeed[i] * 0.5) * (0.3 + disperse);
      p.array[i * 3 + 1] = y > 17 ? -17 : y;
    }
    p.needsUpdate = true;
    this.dust.material.opacity = 0.6 * (1 - disperse * 0.7);
  }
}
