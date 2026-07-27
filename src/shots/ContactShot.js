import * as THREE from 'three';
import { Shot } from '../core/ShotSystem.js';
import { SIMPLEX3 } from '../core/noise.js';

/* ACT III — CONTACT. The gas that made every frame finally disperses and settles.
   Type lives in the DOM overlay; this is the ground it sits on. */

const vert = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const frag = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uScale;
uniform float uSeed;
uniform float uOpacity;
uniform vec3  uColA;
uniform vec3  uColB;
varying vec2 vUv;

${SIMPLEX3}

void main(){
  vec2 uv = vUv;
  float t = uTime * 0.03 + uSeed;

  vec2 w = vec2(
    fbm(vec3(uv * 1.6 + uSeed, t), 4),
    fbm(vec3(uv * 1.6 + uSeed + 4.1, t), 4)
  );
  float d = fbm(vec3((uv + w * 0.30) * uScale, t * 1.3), 5) * 0.5 + 0.5;

  // settle toward the horizon line rather than filling frame
  float band = smoothstep(0.0, 0.55, uv.y) * (1.0 - smoothstep(0.45, 1.0, uv.y));
  float density = smoothstep(0.34, 0.86, d) * (0.25 + band);

  vec3 col = mix(uColA, uColB, d);
  gl_FragColor = vec4(col * density * uOpacity, 1.0);
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
        bloom: 0.7,
      },
    });
  }

  build() {
    this.camera.fov = 36;
    this.camera.position.set(0, 0, 0);
    this.camera.updateProjectionMatrix();

    this.layers = [
      { dist: 6.0, scale: 2.6, opacity: 0.42, seed: 1.3 },
      { dist: 9.0, scale: 1.7, opacity: 0.55, seed: 6.9 },
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
          uColA: { value: new THREE.Color(0x15294a) },
          uColB: { value: new THREE.Color(0x6fb6ff) },
        },
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      m.position.z = -L.dist;
      m.userData.dist = L.dist;
      m.frustumCulled = false;
      this.scene.add(m);
      return m;
    });

    const N = 1400;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos.set([
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 34,
        -6 - Math.random() * 30,
      ], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({
      color: 0x8fb8e6, size: 0.035, transparent: true, opacity: 0.6,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    this.scene.add(this.dust);

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
    for (const m of this.layers) m.material.uniforms.uTime.value = t;
    this.camera.position.x = Math.sin(t * 0.07) * 0.24;
    this.camera.position.y = -0.4 + localP * 0.8;
    this.camera.lookAt(0, 0, -6);
    this.dust.rotation.z = t * 0.004;
  }
}
