import * as THREE from 'three';
import { Shot } from '../core/ShotSystem.js';
import { PROJECTS } from '../data/projects.js';
import { input } from '../core/Input.js';

/* ACT II / 01 — DAVINA AEROSPACE.  The look-dev frame.  See SHOTLIST.md §6.

   Orbital vantage at the terminator. One key light (the sun) at a grazing angle
   behind the limb, everything on the near side falling to black. The telemetry is
   IN the scene — reticles that lock onto surface points and drift — not a DOM panel
   floating above it. FOV 30, because compression is what makes CG read as photographed. */

const DATA = PROJECTS.find((p) => p.id === 'davina');

const R = 160;                                   // planet radius
const CENTER = new THREE.Vector3(0, -170, -260); // places the limb across the lower frame
const SUN = new THREE.Vector3(-500, 120, -480);  // grazing key -> hard terminator

/* ---------- atmosphere: rim scattering modulated by sun direction ---------- */

const atmoVert = /* glsl */ `
varying vec3 vWorldN;
varying vec3 vViewN;
varying vec3 vViewDir;
void main(){
  vWorldN = normalize(mat3(modelMatrix) * normal);
  vViewN  = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const atmoFrag = /* glsl */ `
precision highp float;
uniform vec3  uSunDir;
uniform vec3  uLit;
uniform vec3  uShadow;
uniform float uPower;
uniform float uAlpha;
varying vec3 vWorldN;
varying vec3 vViewN;
varying vec3 vViewDir;

void main(){
  float rim = pow(1.0 - abs(dot(normalize(vViewN), normalize(vViewDir))), uPower);

  // how much this bit of shell faces the sun -> the terminator
  float sun = dot(normalize(vWorldN), uSunDir);
  float lit = smoothstep(-0.28, 0.42, sun);

  // forward scattering: the arc goes hot right at the limb on the lit side
  float fwd = pow(max(lit, 0.0), 2.2);

  vec3 col = mix(uShadow, uLit, lit);
  col *= 0.25 + 2.1 * fwd;

  float a = rim * uAlpha * (0.05 + 0.95 * lit);
  gl_FragColor = vec4(col, a);
}
`;

/* ---------- in-world UI textures ---------- */

function reticleTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  const s = size, m = s * 0.18, len = s * 0.16;
  x.strokeStyle = '#bfe6ff';
  x.lineWidth = Math.max(2, s * 0.012);
  x.lineCap = 'square';

  // four corner brackets
  const corners = [[m, m, 1, 1], [s - m, m, -1, 1], [m, s - m, 1, -1], [s - m, s - m, -1, -1]];
  for (const [cx, cy, dx, dy] of corners) {
    x.beginPath();
    x.moveTo(cx, cy + dy * len);
    x.lineTo(cx, cy);
    x.lineTo(cx + dx * len, cy);
    x.stroke();
  }

  // centre crosshair
  x.globalAlpha = 0.75;
  x.beginPath();
  x.moveTo(s / 2, s * 0.42); x.lineTo(s / 2, s * 0.46);
  x.moveTo(s / 2, s * 0.54); x.lineTo(s / 2, s * 0.58);
  x.moveTo(s * 0.42, s / 2); x.lineTo(s * 0.46, s / 2);
  x.moveTo(s * 0.54, s / 2); x.lineTo(s * 0.58, s / 2);
  x.stroke();

  // lock arc
  x.globalAlpha = 0.5;
  x.beginPath();
  x.arc(s / 2, s / 2, s * 0.3, -0.6, 0.9);
  x.stroke();
  x.beginPath();
  x.arc(s / 2, s / 2, s * 0.3, Math.PI - 0.6, Math.PI + 0.9);
  x.stroke();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function labelTexture(lines, w = 512, h = 128) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.clearRect(0, 0, w, h);
  x.font = `500 ${h * 0.26}px "JetBrains Mono", ui-monospace, monospace`;
  x.textBaseline = 'top';
  x.fillStyle = '#a8d8ff';
  lines.forEach((ln, i) => x.fillText(ln, 8, 6 + i * h * 0.34));
  x.strokeStyle = 'rgba(168,216,255,0.45)';
  x.lineWidth = 2;
  x.beginPath(); x.moveTo(2, 4); x.lineTo(2, h - 8); x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Point on the sphere from lat/lon, pushed just clear of the surface. */
function surfacePoint(latDeg, lonDeg, lift = 1.015) {
  const la = THREE.MathUtils.degToRad(latDeg);
  const lo = THREE.MathUtils.degToRad(lonDeg);
  return new THREE.Vector3(
    Math.cos(la) * Math.cos(lo),
    Math.sin(la),
    Math.cos(la) * Math.sin(lo),
  ).multiplyScalar(R * lift).add(CENTER);
}

export class DavinaShot extends Shot {
  constructor(assets) {
    super({
      id: DATA.id,
      label: DATA.name,
      scrollVh: 160,
      edgeColor: 0x8fd4ff,
      grade: DATA.grade,
    });
    this.assets = assets;
    this.data = DATA;
  }

  build() {
    const S = this.scene;

    this.camera.fov = 30;
    this.camera.near = 1;
    this.camera.far = 6000;
    this.camera.updateProjectionMatrix();

    S.fog = null;

    /* ---- starfield: two populations so it is not a uniform dot grid ---- */
    const mkStars = (n, radius, size, opacity, color) => {
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const v = new THREE.Vector3(
          Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5,
        ).normalize().multiplyScalar(radius * (0.9 + Math.random() * 0.2));
        pos.set([v.x, v.y, v.z], i * 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      return new THREE.Points(g, new THREE.PointsMaterial({
        color, size, transparent: true, opacity,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
      }));
    };
    this.starsFar = mkStars(4200, 2600, 2.6, 0.55, 0xaec8ff);
    this.starsNear = mkStars(420, 2400, 6.5, 0.9, 0xffffff);
    S.add(this.starsFar, this.starsNear);

    /* ---- the planet ---- */
    const surfaceMap = this.assets.texture('textures/2k_earth_daymap.jpg');
    this.planet = new THREE.Mesh(
      new THREE.SphereGeometry(R, 128, 128),
      new THREE.MeshStandardMaterial({
        map: surfaceMap,
        roughness: 0.97,
        metalness: 0.0,
        color: new THREE.Color(0xaebfd6), // cools the albedo toward the grade
      }),
    );
    this.planet.position.copy(CENTER);
    this.planet.rotation.z = THREE.MathUtils.degToRad(-14);
    S.add(this.planet);

    const sunDir = SUN.clone().sub(CENTER).normalize();

    this.atmo = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.035, 96, 96),
      new THREE.ShaderMaterial({
        vertexShader: atmoVert,
        fragmentShader: atmoFrag,
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uSunDir: { value: sunDir },
          uLit: { value: new THREE.Color(0x8fd0ff) },
          uShadow: { value: new THREE.Color(0x14243f) },
          uPower: { value: 3.1 },
          uAlpha: { value: 1.25 },
        },
      }),
    );
    this.atmo.position.copy(CENTER);
    S.add(this.atmo);

    /* ---- lighting: ONE key. everything else falls to black. ----
       Intensities tuned against measured frame coverage: at the original 4.2 the
       AgX tonemap + grade crushed the shot to 10% of the frame above threshold,
       which read as a black screen. ~3.5x lifts it to ~23% without flattening
       the terminator. */
    const key = new THREE.DirectionalLight(0xfff0dc, 15);
    key.position.copy(SUN);
    key.target.position.copy(CENTER);
    S.add(key, key.target);
    // a whisper of bounce so the dark side is not pure void
    S.add(new THREE.AmbientLight(0x14202f, 1.9));

    /* ---- orbital lattice ---- */
    this.rings = new THREE.Group();
    const ringSpecs = [
      { r: R * 1.14, inc: 18, node: 10, op: 0.34 },
      { r: R * 1.22, inc: -34, node: 62, op: 0.24 },
      { r: R * 1.33, inc: 66, node: 120, op: 0.18 },
      { r: R * 1.09, inc: -6, node: 200, op: 0.30 },
    ];
    for (const spec of ringSpecs) {
      const SEG = 320;
      const pos = new Float32Array(SEG * 3);
      for (let i = 0; i < SEG; i++) {
        const a = (i / SEG) * Math.PI * 2;
        pos.set([Math.cos(a) * spec.r, 0, Math.sin(a) * spec.r], i * 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const line = new THREE.LineLoop(g, new THREE.LineBasicMaterial({
        color: 0x74c4ff, transparent: true, opacity: spec.op,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      line.rotation.x = THREE.MathUtils.degToRad(spec.inc);
      line.rotation.y = THREE.MathUtils.degToRad(spec.node);
      line.userData.spin = (Math.random() - 0.5) * 0.006;
      this.rings.add(line);
    }
    this.rings.position.copy(CENTER);
    S.add(this.rings);

    /* ---- in-world telemetry: reticles locked to the lit side ---- */
    const retTex = reticleTexture();
    this.reticles = [];
    const marks = [
      { lat: 26, lon: -132, label: ['TRK 01  LOCK', 'LAT 26.4N  ALT 411KM'] },
      { lat: -6, lon: -158, label: ['TRK 02  LOCK', 'LAT 06.1S  ALT 408KM'] },
      { lat: 44, lon: -104, label: ['TRK 03  ACQ', 'LAT 44.9N  ALT 415KM'] },
    ];
    for (const m of marks) {
      const grp = new THREE.Group();
      const p = surfacePoint(m.lat, m.lon);
      grp.position.copy(p);

      const spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: retTex, transparent: true, opacity: 0.85,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      spr.scale.setScalar(15);
      grp.add(spr);

      const lab = new THREE.Sprite(new THREE.SpriteMaterial({
        map: labelTexture(m.label), transparent: true, opacity: 0.8,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      lab.scale.set(30, 7.5, 1);
      lab.position.set(19, 7, 0);
      grp.add(lab);

      grp.userData.seed = Math.random() * 7;
      this.reticles.push(grp);
      S.add(grp);
    }

    /* ---- high-atmosphere particulate catching the key ---- */
    const N = 2600;
    const pp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const v = new THREE.Vector3(
        Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5,
      ).normalize().multiplyScalar(R * (1.02 + Math.random() * 0.5));
      pp.set([v.x, v.y, v.z], i * 3);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    this.ice = new THREE.Points(pg, new THREE.PointsMaterial({
      color: 0xcfe8ff, size: 1.5, transparent: true, opacity: 0.5,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    this.ice.position.copy(CENTER);
    S.add(this.ice);
  }

  update(dt, t, localP) {
    // slow orbital drift across the shot + a little handheld
    const a = -0.30 + localP * 0.62;
    const rad = 300 - localP * 46;             // gentle push in
    const hx = Math.sin(t * 0.21) * 1.5 + Math.sin(t * 0.53) * 0.6;
    const hy = Math.cos(t * 0.17) * 1.1 + Math.cos(t * 0.44) * 0.5;

    // pointer parallax: the vantage shifts with the cursor, so the limb and the
    // starfield shear against each other and the shot stops feeling like a poster
    this.camera.position.set(
      Math.sin(a) * rad + hx + input.px * 16,
      34 + localP * 16 + hy + input.py * 10,
      Math.cos(a) * rad * 0.34 + 44,
    );
    this.camera.lookAt(
      CENTER.x + Math.sin(a) * 24 + input.px * 6,
      CENTER.y + R + 14 + localP * 8 + input.py * 4,
      CENTER.z + 150,
    );

    this.planet.rotation.y += dt * 0.0075;
    this.ice.rotation.y += dt * 0.010;
    this.starsFar.rotation.y += dt * 0.0004;

    for (const r of this.rings.children) r.rotation.z += r.userData.spin * dt * 12;

    // reticles breathe and face camera; they read as tracking, not decals
    for (const g of this.reticles) {
      const s = g.userData.seed;
      const pulse = 15 + Math.sin(t * 1.7 + s) * 1.1;
      g.children[0].scale.setScalar(pulse);
      g.children[0].material.opacity = 0.62 + Math.sin(t * 2.3 + s) * 0.22;
      g.children[1].material.opacity = 0.55 + Math.sin(t * 1.1 + s) * 0.2;
    }
  }
}
