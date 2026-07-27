import * as THREE from 'three';
import { Shot } from '../core/ShotSystem.js';
import { PROJECTS } from '../data/projects.js';
import { input } from '../core/Input.js';
import { hash } from '../core/math.js';

/* ACT II / 05 — BUDDY APP.  SHOTLIST.md §5.

   The relief. Four worlds in a row have been emissive diagrams floating in a void;
   this one is a lit object on a surface, at human scale, photographed close. That
   contrast is the point — it is the only shot in the film with real materials, a
   real key light and a real shadow-side, and it lands because of what precedes it.

   The screen is also the practical: a violet fill light parented to the device, so
   the object is lit by its own interface. Everything else falls to black. */

const DATA = PROJECTS.find((p) => p.id === 'buddy');

const VIOLET = '#c9a6ff';
const INK = '#efe6ff';

/* ------------------------------ the screen ----------------------------- */

const CHAT = [
  { me: false, text: 'morning. you slept 5h.' },
  { me: false, text: 'want the light version\nof today?' },
  { me: true, text: 'yes please' },
  { me: false, text: 'moved your 9am.\ntwo things left before\nlunch.' },
  { me: true, text: 'thank you' },
  { me: false, text: 'i got you.' },
];

function screenTexture(w = 620, h = 1280) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');

  x.fillStyle = '#0b0715';
  x.fillRect(0, 0, w, h);

  const round = (x0, y0, w0, h0, r) => {
    x.beginPath();
    x.moveTo(x0 + r, y0);
    x.arcTo(x0 + w0, y0, x0 + w0, y0 + h0, r);
    x.arcTo(x0 + w0, y0 + h0, x0, y0 + h0, r);
    x.arcTo(x0, y0 + h0, x0, y0, r);
    x.arcTo(x0, y0, x0 + w0, y0, r);
    x.closePath();
  };

  // status bar
  x.font = '500 22px "JetBrains Mono", ui-monospace, monospace';
  x.fillStyle = 'rgba(220,205,255,0.5)';
  x.fillText('9:41', 34, 52);
  x.textAlign = 'right';
  x.fillText('BUDDY', w - 34, 52);
  x.textAlign = 'left';

  // header
  x.font = '600 44px "Space Grotesk", system-ui, sans-serif';
  x.fillStyle = INK;
  x.fillText('Buddy', 34, 132);
  x.font = '400 24px "Space Grotesk", system-ui, sans-serif';
  x.fillStyle = 'rgba(201,166,255,0.7)';
  x.fillText('always here', 34, 172);

  x.strokeStyle = 'rgba(201,166,255,0.18)';
  x.lineWidth = 2;
  x.beginPath(); x.moveTo(34, 206); x.lineTo(w - 34, 206); x.stroke();

  // bubbles
  let y = 258;
  x.font = '400 27px "Space Grotesk", system-ui, sans-serif';
  for (const m of CHAT) {
    const lines = m.text.split('\n');
    const tw = Math.max(...lines.map((l) => x.measureText(l).width));
    const bw = tw + 52;
    const bh = lines.length * 38 + 40;
    const bx = m.me ? w - 34 - bw : 34;

    round(bx, y, bw, bh, 22);
    if (m.me) {
      x.fillStyle = 'rgba(201,166,255,0.22)';
      x.fill();
      x.strokeStyle = 'rgba(201,166,255,0.55)';
      x.lineWidth = 2;
      x.stroke();
      x.fillStyle = INK;
    } else {
      x.fillStyle = 'rgba(255,255,255,0.045)';
      x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.10)';
      x.lineWidth = 2;
      x.stroke();
      x.fillStyle = 'rgba(240,236,255,0.92)';
    }
    lines.forEach((l, i) => x.fillText(l, bx + 26, y + 42 + i * 38));
    y += bh + 22;
  }

  // composer
  const cy = h - 132;
  round(34, cy, w - 68, 82, 26);
  x.fillStyle = 'rgba(255,255,255,0.05)';
  x.fill();
  x.strokeStyle = 'rgba(201,166,255,0.30)';
  x.lineWidth = 2;
  x.stroke();
  x.font = '400 26px "Space Grotesk", system-ui, sans-serif';
  x.fillStyle = 'rgba(220,205,255,0.42)';
  x.fillText('say something…', 66, cy + 50);
  x.beginPath();
  x.arc(w - 84, cy + 41, 24, 0, Math.PI * 2);
  x.fillStyle = VIOLET;
  x.fill();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* The conversation arrives as you scroll, top-down, with the newest line warm. */
const screenVert = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const screenFrag = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
uniform float uReveal;     // 0..1 down the screen
uniform float uGlow;
uniform vec3  uWarm;
varying vec2 vUv;
void main(){
  // uv.y is 0 at the bottom; the conversation is authored top-down
  float down = 1.0 - vUv.y;
  float edge = uReveal - down;
  if (edge < -0.02) discard;

  vec3 c = texture2D(uMap, vUv).rgb;
  float in_ = smoothstep(-0.02, 0.04, edge);
  // the line currently arriving runs warm, then settles. kept narrow — a wide
  // band reads as a lighting error across a third of the screen, not as an event
  float fresh = 1.0 - smoothstep(0.0, 0.045, edge);

  gl_FragColor = vec4((c + uWarm * fresh * 0.30) * in_ * uGlow, 1.0);
}
`;

export class BuddyShot extends Shot {
  constructor() {
    super({
      id: DATA.id,
      label: DATA.name,
      scrollVh: 140,
      edgeColor: 0xc9a6ff,
      grade: DATA.grade,
    });
    this.data = DATA;
  }

  build() {
    const S = this.scene;

    this.camera.fov = 35;
    this.camera.near = 0.1;
    this.camera.far = 400;
    this.camera.updateProjectionMatrix();

    /* ---- the surface it rests on ---- */
    const table = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({
        color: 0x171120,
        roughness: 0.9,
        metalness: 0.0,
      }),
    );
    table.rotation.x = -Math.PI / 2;
    S.add(table);

    /* ---- the device ---- */
    this.device = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(9.4, 0.55, 19.2),
      // Low metalness on purpose. A metal with no environment map has nothing to
      // reflect and renders black under a single directional light — the body
      // disappeared entirely at 0.72. Dielectric with a tight roughness gives the
      // machined-aluminium highlight this needs without needing an IBL.
      new THREE.MeshStandardMaterial({
        color: 0x241d30,
        roughness: 0.34,
        metalness: 0.22,
      }),
    );
    body.position.y = 0.28;
    this.device.add(body);

    this.screen = new THREE.Mesh(
      new THREE.PlaneGeometry(8.5, 18.2),
      new THREE.ShaderMaterial({
        vertexShader: screenVert,
        fragmentShader: screenFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uMap: { value: screenTexture() },
          uReveal: { value: 0 },
          uGlow: { value: 1.0 },
          uWarm: { value: new THREE.Color(0x8f6fd8) },
        },
      }),
    );
    this.screen.rotation.x = -Math.PI / 2;
    this.screen.position.y = 0.57;
    this.device.add(this.screen);

    this.device.rotation.y = -0.26;
    S.add(this.device);

    /* ---- lighting: one warm key, plus the screen as a practical ---- */
    const key = new THREE.DirectionalLight(0xffd7ad, 9.0);
    key.position.set(-16, 22, 12);
    key.target.position.set(0, 0, 0);
    S.add(key, key.target);

    // The device lights its own surroundings — this is what makes it intimate.
    // Short range on purpose: the spill has to die inside the frame so the shot
    // still falls to black at the edges (SHOTLIST §4.3) rather than becoming a
    // wall-to-wall violet wash.
    this.practical = new THREE.PointLight(0xa87fff, 16, 24, 2.0);
    this.practical.position.set(0, 3.2, -1);
    this.device.add(this.practical);

    S.add(new THREE.AmbientLight(0x1c1630, 1.5));

    /* ---- out-of-focus foreground: real geometry, bloom does the rest ---- */
    this.bokeh = new THREE.Group();
    const sphere = new THREE.SphereGeometry(0.16, 10, 10);
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.74 + hash(i) * 0.07, 0.55, 0.62),
        transparent: true,
        opacity: 0.5 + hash(i + 40) * 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));
      m.position.set(
        (hash(i * 3 + 1) - 0.5) * 30,
        1.5 + hash(i * 3 + 2) * 12,
        6 + hash(i * 3 + 3) * 16,
      );
      m.userData.seed = hash(i + 9) * 6.283;
      m.scale.setScalar(0.6 + hash(i + 17) * 1.5);
      this.bokeh.add(m);
    }
    S.add(this.bokeh);
  }

  update(dt, t, localP) {
    // the conversation arrives as the shot plays
    this.screen.material.uniforms.uReveal.value = 0.06 + localP * 1.05;
    this.screen.material.uniforms.uGlow.value = 1.0 + Math.sin(t * 0.6) * 0.05;
    this.practical.intensity = 24 + Math.sin(t * 0.8) * 3;

    // the device breathes rather than sits — SHOTLIST §4.6
    this.device.rotation.y = -0.26 + Math.sin(t * 0.21) * 0.035 + input.px * 0.06;
    this.device.rotation.z = Math.sin(t * 0.17) * 0.012;

    // a slow push in. barely any move: this shot is the exhale
    const push = localP;
    this.camera.position.set(
      7.4 - push * 2.2 + Math.sin(t * 0.19) * 0.22 + input.px * 1.5,
      17.5 - push * 3.4 + Math.cos(t * 0.23) * 0.18 + input.py * 1.1,
      15.5 - push * 2.6,
    );
    this.camera.lookAt(
      -0.4 + input.px * 0.5,
      1.2,
      -0.6 + input.py * 0.4,
    );
    this.camera.rotation.z += Math.sin(t * 0.13) * 0.005;

    for (const b of this.bokeh.children) {
      b.position.y += Math.sin(t * 0.5 + b.userData.seed) * dt * 0.32;
    }
  }
}
