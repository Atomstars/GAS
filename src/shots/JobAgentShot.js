import * as THREE from 'three';
import { Shot } from '../core/ShotSystem.js';
import { PROJECTS } from '../data/projects.js';
import { textPlane } from '../core/Text.js';
import { input } from '../core/Input.js';
import { ramp, hash } from '../core/math.js';

/* ACT II / 02 — JOB-AGENT.  SHOTLIST.md §5.

   A dark graph that thinks. The whole point of this project is that something
   autonomous is running while you are not watching, so the frame has to show a
   process mid-flight, not a diagram of one: candidate edges flicker as they are
   evaluated, and a committed traversal burns through the network with a trail.

   The traversal head is driven by scroll AND by time. Scroll advances the agent
   through its route, so the viewer is piloting the search; time keeps it alive
   when the scroll is still, because a frozen agent would contradict the claim. */

const DATA = PROJECTS.find((p) => p.id === 'job-agent');

const NODES = 156;
const NEIGHBOURS = 4;
const PATH_LEN = 54;

/* The cloud is a squashed tube rather than a box: the camera flies along its
   axis, so density has to be highest near that axis or the frame is mostly empty
   space with a few dots at the edges. Measured at box distribution: 1.3% of the
   frame above black. */
const RADIUS = 19;
const Y_SQUASH = 0.58;
const DEPTH = 74;
const Z0 = -16;

/* ------------------------------- shaders ------------------------------- */

const nodeVert = /* glsl */ `
attribute float aSeed;
attribute float aVisit;      // path step at which the agent reaches this node, or -1
uniform float uHead;
uniform float uTime;
uniform float uSize;
varying float vGlow;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);

  float d = uHead - aVisit;
  float fire = aVisit < 0.0 ? 0.0 : exp(-max(d, 0.0) * 1.5) * step(-0.7, d);

  float idle = 0.62 + 0.26 * sin(uTime * 1.9 + aSeed * 6.283);
  vGlow = idle + fire * 3.2;

  // Depth gating. A point sprite's size goes as 1/z, so a node drifting through
  // the lens grows without bound and fills the frame with one flat disc — measured
  // at 38% frame coverage from a single node. Fading it out as it approaches is
  // also what a real lens does: something that close is far outside focus.
  float dist = max(-mv.z, 0.001);
  vGlow *= smoothstep(2.5, 11.0, dist) * (1.0 - smoothstep(95.0, 155.0, dist));

  gl_PointSize = min(uSize * (1.0 + fire * 2.1) * (300.0 / dist), 70.0);
  gl_Position = projectionMatrix * mv;
}
`;

const nodeFrag = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform vec3 uHot;
varying float vGlow;
void main(){
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = dot(p, p);
  if (r > 1.0) discard;
  // a crisp disc with a narrow edge — the halo is bloom's job, not a gradient's
  float a = smoothstep(1.0, 0.30, r);
  vec3 col = mix(uColor, uHot, clamp(vGlow - 0.7, 0.0, 1.0));
  gl_FragColor = vec4(col * vGlow * a, 1.0);
}
`;

/* Candidate edges: mostly dark, occasionally spiking as they are evaluated. */
const meshVert = /* glsl */ `
attribute float aSeed;
uniform float uTime;
varying float vG;
void main(){
  float s = sin(uTime * 1.15 + aSeed * 19.7);
  // a low floor so the network is always legible as a structure, plus a rare
  // sharp spike so individual edges read as being evaluated one at a time
  vG = 0.20 + 0.95 * pow(max(s, 0.0), 14.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const meshFrag = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform vec3 uHot;
varying float vG;
void main(){
  gl_FragColor = vec4(mix(uColor, uHot, vG) * vG, 1.0);
}
`;

/* The committed route: burns at the head, decays behind it. */
const pathVert = /* glsl */ `
attribute float aIdx;
uniform float uHead;
varying float vG;
void main(){
  float d = uHead - aIdx;
  vG = d < -0.4 ? 0.0 : exp(-max(d, 0.0) * 0.34);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const pathFrag = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform vec3 uHot;
varying float vG;
void main(){
  if (vG < 0.004) discard;
  vec3 col = mix(uColor, uHot, pow(vG, 0.6));
  gl_FragColor = vec4(col * (0.30 + vG * 2.8), 1.0);
}
`;

export class JobAgentShot extends Shot {
  constructor() {
    super({
      id: DATA.id,
      label: DATA.name,
      scrollVh: 150,
      edgeColor: 0xffb45c,
      grade: DATA.grade,
    });
    this.data = DATA;
    this.head = 0;
  }

  build() {
    const S = this.scene;

    this.camera.fov = 31;
    this.camera.near = 0.5;
    this.camera.far = 900;
    this.camera.updateProjectionMatrix();

    /* ---- node cloud. Deterministic, so the graph is the same every visit and
            the composition can actually be art-directed. ---- */
    const pts = [];
    for (let i = 0; i < NODES; i++) {
      const a = hash(i * 3 + 1) * Math.PI * 2;
      const r = Math.sqrt(hash(i * 3 + 2)) * RADIUS;   // sqrt keeps the disc even
      pts.push(new THREE.Vector3(
        Math.cos(a) * r,
        Math.sin(a) * r * Y_SQUASH,
        Z0 - hash(i * 3 + 3) * DEPTH,
      ));
    }
    this.points = pts;

    /* ---- connect each node to its nearest neighbours ---- */
    const edgeSet = new Set();
    const edges = [];
    for (let i = 0; i < NODES; i++) {
      const order = [];
      for (let j = 0; j < NODES; j++) {
        if (i !== j) order.push([pts[i].distanceToSquared(pts[j]), j]);
      }
      order.sort((a, b) => a[0] - b[0]);
      for (let k = 0; k < NEIGHBOURS; k++) {
        const j = order[k][1];
        const key = i < j ? `${i}_${j}` : `${j}_${i}`;
        if (edgeSet.has(key)) continue;
        edgeSet.add(key);
        edges.push([i, j]);
      }
    }
    this.adj = pts.map(() => []);
    for (const [a, b] of edges) { this.adj[a].push(b); this.adj[b].push(a); }

    /* ---- the candidate mesh ---- */
    const mPos = new Float32Array(edges.length * 6);
    const mSeed = new Float32Array(edges.length * 2);
    edges.forEach(([a, b], i) => {
      mPos.set([pts[a].x, pts[a].y, pts[a].z, pts[b].x, pts[b].y, pts[b].z], i * 6);
      const s = hash(i + 77);
      mSeed[i * 2] = s; mSeed[i * 2 + 1] = s;
    });
    const mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.BufferAttribute(mPos, 3));
    mg.setAttribute('aSeed', new THREE.BufferAttribute(mSeed, 1));
    this.mesh = new THREE.LineSegments(mg, new THREE.ShaderMaterial({
      vertexShader: meshVert,
      fragmentShader: meshFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xa8631f) },
        uHot: { value: new THREE.Color(0xffc98a) },
      },
    }));
    S.add(this.mesh);

    /* ---- the agent's route: a walk that prefers to keep going forward ---- */
    const path = [0];
    let cur = 0;
    for (let s = 1; s < PATH_LEN; s++) {
      const opts = this.adj[cur].filter((n) => n !== path[s - 2]);
      const pool = opts.length ? opts : this.adj[cur];
      // deepest-first bias: the route should travel INTO the frame, not loop
      pool.sort((a, b) => pts[a].z - pts[b].z);
      const pick = pool[Math.floor(hash(s * 5 + 13) * Math.min(2, pool.length))];
      path.push(pick);
      cur = pick;
    }
    this.path = path;

    const segs = path.length - 1;
    const pPos = new Float32Array(segs * 6);
    const pIdx = new Float32Array(segs * 2);
    for (let i = 0; i < segs; i++) {
      const a = pts[path[i]], b = pts[path[i + 1]];
      pPos.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6);
      pIdx[i * 2] = i; pIdx[i * 2 + 1] = i;
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pg.setAttribute('aIdx', new THREE.BufferAttribute(pIdx, 1));
    this.route = new THREE.LineSegments(pg, new THREE.ShaderMaterial({
      vertexShader: pathVert,
      fragmentShader: pathFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uHead: { value: 0 },
        uColor: { value: new THREE.Color(0xff9b2f) },
        uHot: { value: new THREE.Color(0xfff0d0) },
      },
    }));
    S.add(this.route);

    /* ---- nodes ---- */
    const nPos = new Float32Array(NODES * 3);
    const nSeed = new Float32Array(NODES);
    const nVisit = new Float32Array(NODES).fill(-1);
    pts.forEach((p, i) => {
      nPos.set([p.x, p.y, p.z], i * 3);
      nSeed[i] = hash(i + 5);
    });
    path.forEach((n, step) => { if (nVisit[n] < 0) nVisit[n] = step; });

    const ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.BufferAttribute(nPos, 3));
    ng.setAttribute('aSeed', new THREE.BufferAttribute(nSeed, 1));
    ng.setAttribute('aVisit', new THREE.BufferAttribute(nVisit, 1));
    this.nodes = new THREE.Points(ng, new THREE.ShaderMaterial({
      vertexShader: nodeVert,
      fragmentShader: nodeFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uHead: { value: 0 },
        uTime: { value: 0 },
        uSize: { value: 4.6 },
        uColor: { value: new THREE.Color(0xff8f33) },
        uHot: { value: new THREE.Color(0xfff2dc) },
      },
    }));
    S.add(this.nodes);

    /* ---- in-world stage labels: the loop, named where it happens ---- */
    const STAGES = [
      { text: 'SCAN', at: 6 },
      { text: 'RANK', at: 20 },
      { text: 'TAILOR', at: 34 },
      { text: 'APPLY', at: 47 },
    ];
    this.labels = STAGES.map((s) => {
      const n = pts[path[Math.min(s.at, path.length - 1)]];
      const m = textPlane(s.text, {
        height: 1.7,
        font: '"JetBrains Mono", ui-monospace, monospace',
        weight: 500,
        size: 64,
        tracking: 0.24,
        color: 0xffb257,
        hot: 0xfff2dc,
        glow: 0.5,
      });
      m.position.set(n.x + 2.4, n.y + 1.9, n.z);
      m.userData.step = s.at;
      m.setOpacity(0);
      S.add(m);
      return m;
    });

    /* ---- a faint volumetric haze so the void has depth ---- */
    const N = 2200;
    const hp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = hash(i * 7 + 1) * Math.PI * 2;
      const r = Math.sqrt(hash(i * 7 + 2)) * RADIUS * 2.1;
      hp.set([
        Math.cos(a) * r,
        Math.sin(a) * r * Y_SQUASH,
        Z0 + 26 - hash(i * 7 + 3) * (DEPTH + 70),
      ], i * 3);
    }
    const hg = new THREE.BufferGeometry();
    hg.setAttribute('position', new THREE.BufferAttribute(hp, 3));
    this.haze = new THREE.Points(hg, new THREE.PointsMaterial({
      color: 0xc07a34, size: 0.12, transparent: true, opacity: 0.5,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    S.add(this.haze);
  }

  update(dt, t, localP) {
    // scroll pilots the search; time keeps it running when the scroll is still
    this.head = localP * (PATH_LEN - 6) + t * 0.5;
    const head = this.head % (PATH_LEN + 8);

    this.nodes.material.uniforms.uHead.value = head;
    this.nodes.material.uniforms.uTime.value = t;
    this.route.material.uniforms.uHead.value = head;
    this.mesh.material.uniforms.uTime.value = t;

    // a slow push down the length of the graph, arcing sideways
    // flies ALONG the tube's axis, not around the outside of it
    const a = -0.4 + localP * 0.8;
    this.camera.position.set(
      Math.sin(a) * 9 + input.px * 3.0 + Math.sin(t * 0.23) * 0.5,
      4 - localP * 4 + input.py * 2.0 + Math.cos(t * 0.19) * 0.35,
      18 - localP * 76,
    );
    this.camera.lookAt(
      Math.sin(a) * 6 + input.px * 1.4,
      input.py * 0.8,
      this.camera.position.z - 34,
    );
    this.camera.rotation.z = Math.sin(t * 0.16) * 0.008;

    // labels light with the stage they name, then release
    for (const m of this.labels) {
      const d = head - m.userData.step;
      m.setOpacity(ramp(d, -5, 0) * ramp(d, 13, 5));
      m.lookAt(this.camera.position);
    }
  }
}
