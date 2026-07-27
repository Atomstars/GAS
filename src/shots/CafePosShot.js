import * as THREE from 'three';
import { Shot } from '../core/ShotSystem.js';
import { PROJECTS } from '../data/projects.js';
import { input } from '../core/Input.js';
import { ramp, hash } from '../core/math.js';

/* ACT II / 03 — CAFÉ POS × n8n.  SHOTLIST.md §5.

   A working machine, seen side-on. This is the one shot in the film with almost
   no perspective: FOV 13 from a long way back, which flattens the workflow into
   an elevation drawing. That is deliberate contrast — every other world has depth
   and drift, so a shot that reads as a schematic lands as a change of register
   rather than as a flat frame.

   The rhythm is mechanical on purpose. Orders enter at a fixed cadence, each node
   fires when a packet reaches it, and the machine keeps running whether or not
   anyone is scrolling. */

const DATA = PROJECTS.find((p) => p.id === 'cafe-pos');

const COPPER = '#ffa367';
const CREAM = '#ffe9d2';

/* ---------------------------- node cards ---------------------------- */

function cardTexture(title, sub, { w = 512, h = 256, accent = COPPER } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  const r = 16;

  const round = (x0, y0, w0, h0, rr) => {
    x.beginPath();
    x.moveTo(x0 + rr, y0);
    x.arcTo(x0 + w0, y0, x0 + w0, y0 + h0, rr);
    x.arcTo(x0 + w0, y0 + h0, x0, y0 + h0, rr);
    x.arcTo(x0, y0 + h0, x0, y0, rr);
    x.arcTo(x0, y0, x0 + w0, y0, rr);
    x.closePath();
  };

  const pad = 10;
  // body — barely there, so the card reads as an outline not a panel
  round(pad, pad, w - pad * 2, h - pad * 2, r);
  x.fillStyle = 'rgba(70,38,16,0.55)';
  x.fill();
  x.strokeStyle = accent;
  x.lineWidth = 3;
  x.stroke();

  // header rule
  x.beginPath();
  x.moveTo(pad + 6, pad + 62);
  x.lineTo(w - pad - 6, pad + 62);
  x.strokeStyle = 'rgba(255,163,103,0.5)';
  x.lineWidth = 2;
  x.stroke();

  x.font = '600 40px "JetBrains Mono", ui-monospace, monospace';
  x.textBaseline = 'middle';
  x.fillStyle = CREAM;
  x.fillText(title, pad + 18, pad + 32);

  x.font = '400 26px "JetBrains Mono", ui-monospace, monospace';
  x.fillStyle = 'rgba(255,200,150,0.75)';
  x.fillText(sub, pad + 18, pad + 100);

  // two dummy field rows so the card has the texture of a real workflow node
  x.strokeStyle = 'rgba(255,163,103,0.28)';
  x.lineWidth = 2;
  for (let i = 0; i < 2; i++) {
    const yy = pad + 140 + i * 26;
    x.beginPath();
    x.moveTo(pad + 18, yy);
    x.lineTo(w - pad - 60 - i * 40, yy);
    x.stroke();
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ------------------------------ the graph ----------------------------- */

const CARD_W = 13;
const CARD_H = 6.5;

const NODES = [
  { id: 'in',      title: 'ORDER',    sub: 'counter · app',   x: -46, y: 0 },
  { id: 'pos',     title: 'POS',      sub: 'cart · tender',   x: -23, y: 0 },
  { id: 'hook',    title: 'n8n',      sub: 'webhook',         x: 0,   y: 0 },
  { id: 'kitchen', title: 'KITCHEN',  sub: 'ticket print',    x: 24,  y: 13 },
  { id: 'stock',   title: 'STOCK',    sub: 'decrement',       x: 24,  y: 0 },
  { id: 'receipt', title: 'RECEIPT',  sub: 'email · sms',     x: 24,  y: -13 },
  { id: 'ledger',  title: 'LEDGER',   sub: 'daily close',     x: 47,  y: 0 },
];

const LINKS = [
  ['in', 'pos'], ['pos', 'hook'],
  ['hook', 'kitchen'], ['hook', 'stock'], ['hook', 'receipt'],
  ['kitchen', 'ledger'], ['stock', 'ledger'], ['receipt', 'ledger'],
];

/** Right-angle route from one card's right port to the next card's left port. */
function route(a, b) {
  const x0 = a.x + CARD_W / 2;
  const x1 = b.x - CARD_W / 2;
  const mid = (x0 + x1) / 2;
  if (Math.abs(a.y - b.y) < 0.01) {
    return [new THREE.Vector3(x0, a.y, 0), new THREE.Vector3(x1, b.y, 0)];
  }
  return [
    new THREE.Vector3(x0, a.y, 0),
    new THREE.Vector3(mid, a.y, 0),
    new THREE.Vector3(mid, b.y, 0),
    new THREE.Vector3(x1, b.y, 0),
  ];
}

function measure(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return cum;
}

function sample(pts, cum, s, out) {
  const total = cum[cum.length - 1];
  const d = THREE.MathUtils.clamp(s, 0, total);
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const t = (d - cum[i - 1]) / Math.max(cum[i] - cum[i - 1], 1e-6);
  return out.lerpVectors(pts[i - 1], pts[i], t);
}

/* --------------------------- the canvas grid -------------------------- */

/* The workflow canvas. Dots, not rules: `min(fx, fy)` draws a full lattice that
   out-contrasts the machine standing on it — measured, it was the brightest thing
   in frame. Distance to the nearest lattice POINT gives the sparse ground a
   node editor actually has. Worked in world space so the spacing stays square
   and does not swim as the camera trucks along the plane. */
const gridFrag = /* glsl */ `
precision highp float;
uniform vec3  uColor;
uniform float uCenter;     // camera x — the pool of light travels with the lens
varying vec2 vWorld;
void main(){
  vec2 f = fract(vWorld / 4.0) - 0.5;
  float dots = 1.0 - smoothstep(0.05, 0.16, length(f));
  // The machine is wider than the frame, so a vignette anchored to the machine
  // would black out whichever end the camera trucked to. Anchoring it to the lens
  // gives one travelling key instead — SHOTLIST §4.3.
  float vig = 1.0 - smoothstep(15.0, 44.0, length(vec2(vWorld.x - uCenter, vWorld.y * 1.9)));
  gl_FragColor = vec4(uColor * dots * vig * 0.42, 1.0);
}
`;

const gridVert = /* glsl */ `
varying vec2 vWorld;
void main(){
  vWorld = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/* ------------------------------- packets ------------------------------ */

const pktVert = /* glsl */ `
attribute float aGlow;
uniform float uSize;
varying float vGlow;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vGlow = aGlow;
  gl_PointSize = uSize * (300.0 / max(-mv.z, 1.0));
  gl_Position = projectionMatrix * mv;
}
`;

const pktFrag = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform vec3 uHot;
varying float vGlow;
void main(){
  // square, not a disc: this is product moving through a machine, and the shape
  // should read as manufactured rather than as a light
  vec2 p = abs(gl_PointCoord * 2.0 - 1.0);
  float m = max(p.x, p.y);
  float a = 1.0 - smoothstep(0.62, 0.82, m);
  if (a <= 0.001 || vGlow <= 0.001) discard;
  gl_FragColor = vec4(mix(uColor, uHot, 0.55) * a * vGlow * 2.2, 1.0);
}
`;

const PACKETS_PER_LINK = 3;

export class CafePosShot extends Shot {
  constructor() {
    super({
      id: DATA.id,
      label: DATA.name,
      scrollVh: 145,
      edgeColor: 0xffc98a,
      grade: DATA.grade,
    });
    this.data = DATA;
  }

  build() {
    const S = this.scene;

    // long lens from far back — the compression is the whole look of this shot
    this.camera.fov = 13;
    this.camera.near = 1;
    this.camera.far = 1200;
    this.camera.position.set(0, 0, 200);
    this.camera.updateProjectionMatrix();

    const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));
    this.byId = byId;

    /* ---- workflow canvas ---- */
    const grid = new THREE.Mesh(
      new THREE.PlaneGeometry(190, 110, 1, 1),
      new THREE.ShaderMaterial({
        vertexShader: gridVert,
        fragmentShader: gridFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uColor: { value: new THREE.Color(0x9a5a28) },
          uCenter: { value: 0 },
        },
      }),
    );
    grid.position.z = -14;
    this.grid = grid;
    S.add(grid);

    /* ---- pipes ---- */
    this.links = LINKS.map(([a, b]) => {
      const pts = route(byId[a], byId[b]);
      const cum = measure(pts);
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(g, new THREE.LineBasicMaterial({
        color: 0xff9d5c, transparent: true, opacity: 0.42,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      S.add(line);
      return { a, b, pts, cum, length: cum[cum.length - 1], line };
    });

    /* ---- cards ---- */
    this.cards = NODES.map((n) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(CARD_W, CARD_H),
        new THREE.MeshBasicMaterial({
          map: cardTexture(n.title, n.sub),
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      mesh.position.set(n.x, n.y, 0);
      mesh.userData.node = n;
      mesh.userData.fire = 0;
      S.add(mesh);
      return mesh;
    });

    /* ---- packets ---- */
    const total = this.links.length * PACKETS_PER_LINK;
    this.pkt = [];
    const pos = new Float32Array(total * 3);
    const glow = new Float32Array(total);
    let k = 0;
    for (let li = 0; li < this.links.length; li++) {
      for (let p = 0; p < PACKETS_PER_LINK; p++) {
        this.pkt.push({ link: li, offset: (p + hash(k) * 0.35) / PACKETS_PER_LINK, i: k });
        k++;
      }
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pg.setAttribute('aGlow', new THREE.BufferAttribute(glow, 1));
    this.packets = new THREE.Points(pg, new THREE.ShaderMaterial({
      vertexShader: pktVert,
      fragmentShader: pktFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uSize: { value: 8.5 },
        uColor: { value: new THREE.Color(0xffb877) },
        uHot: { value: new THREE.Color(0xfff2e2) },
      },
    }));
    this.packets.frustumCulled = false;
    S.add(this.packets);

    this._v = new THREE.Vector3();
  }

  update(dt, t, localP) {
    const S = this.scene;

    /* ---- packets: constant cadence, independent of scroll ---- */
    const pos = this.packets.geometry.attributes.position;
    const glow = this.packets.geometry.attributes.aGlow;
    const arrivals = new Map();

    for (const p of this.pkt) {
      const link = this.links[p.link];
      // one full traverse every 2.6s, offset per packet -> an even train
      const cycle = ((t / 2.6) + p.offset) % 1;
      const s = cycle * link.length;
      sample(link.pts, link.cum, s, this._v);
      pos.setXYZ(p.i, this._v.x, this._v.y, 0.4);
      // fade in and out at the ports so packets are emitted, not teleported
      glow.setX(p.i, ramp(cycle, 0, 0.06) * ramp(cycle, 1, 0.94));

      // a packet landing at the far port fires that node
      if (cycle > 0.94) {
        arrivals.set(link.b, Math.max(arrivals.get(link.b) || 0, ramp(cycle, 0.94, 1)));
      }
    }
    pos.needsUpdate = true;
    glow.needsUpdate = true;

    /* ---- cards fire on arrival, then cool ---- */
    for (const card of this.cards) {
      const hit = arrivals.get(card.userData.node.id) || 0;
      const decay = 1 - Math.exp(-dt * 3.2);
      card.userData.fire += (hit - card.userData.fire) * (hit > card.userData.fire ? 0.6 : decay);
      const f = card.userData.fire;
      card.material.opacity = 0.95 + f * 0.55;
      card.scale.setScalar(1 + f * 0.012);
    }

    /* ---- pipes carry a faint standing glow, brighter downstream ---- */
    for (let i = 0; i < this.links.length; i++) {
      this.links[i].line.material.opacity = 0.34 + 0.16 * Math.sin(t * 1.1 + i * 1.7) ** 2;
    }

    /* ---- camera: a slow lateral track along the machine ---- */
    // near-orthographic, so the move is a truck rather than an orbit
    this.camera.position.set(
      -28 + localP * 56 + input.px * 3.4,
      Math.sin(t * 0.16) * 0.8 + input.py * 2.2,
      200 - localP * 26,
    );
    this.camera.lookAt(
      this.camera.position.x * 0.86,
      this.camera.position.y * 0.5,
      0,
    );
    this.camera.rotation.z = Math.sin(t * 0.13) * 0.004;

    this.grid.material.uniforms.uCenter.value = this.camera.position.x * 0.9;
  }
}
