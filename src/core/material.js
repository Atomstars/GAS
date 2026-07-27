import * as THREE from 'three';

/* ==================================================================
   THE MATERIAL LANGUAGE
   One physical vocabulary for the whole film: polished, liquid, and
   lit entirely by the room it sits in. Every frame gets its own room
   — its own accent bars — so the projects read as different worlds
   while still being obviously the same film.
================================================================== */

/* Shared per-frame uniforms. One object, referenced by every material,
   so the pointer and the clock only have to be written once. */
export const SHARED = {
  uTime:      { value: 0 },
  uPointer:   { value: new THREE.Vector3(0, 0, 999) },
  uPointerAmp:{ value: 0 },
  uMelt:      { value: 0 },
};

const NOISE = /* glsl */ `
vec3 m289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
vec4 m289(vec4 x){ return x - floor(x*(1.0/289.0))*289.0; }
vec4 perm(vec4 x){ return m289(((x*34.0)+1.0)*x); }
vec4 tinv(vec4 r){ return 1.79284291400159 - 0.85373472095314*r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = m289(i);
  vec4 p = perm(perm(perm(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 nrm = tinv(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0*=nrm.x; p1*=nrm.y; p2*=nrm.z; p3*=nrm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m*m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

uniform float uTime, uPointerAmp, uMelt;
uniform vec3 uPointer;

/* Surface height field: slow churn, plus a ring travelling out from
   wherever the viewer is pointing or touching. */
float surf(vec3 p) {
  float base = snoise(p * 0.085 + vec3(0.0, 0.0, uTime * 0.18))
             + snoise(p * 0.210 + vec3(3.1, 1.7, uTime * 0.31)) * 0.45;

  float d = distance(p, uPointer);
  float ring = sin(d * 1.15 - uTime * 5.0) * exp(-d * 0.20) * uPointerAmp;

  return base * (1.0 + uMelt * 1.6) + ring;
}
`;

/* What makes metal read as *liquid* is the reflection swimming, which
   comes from the normal moving — not the silhouette. So the normal is
   perturbed hard and the surface displaced only slightly; displacing
   far enough to see melts letterforms past legibility. */
export function makeLiquid(material, { ripple = 0.52, swell = 0.095 } = {}) {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, SHARED);
    shader.vertexShader = `${NOISE}\n${shader.vertexShader}`
      .replace('#include <beginnormal_vertex>', /* glsl */ `
        vec3 objectNormal = vec3(normal);
        {
          float e = 0.55;
          float dx = surf(position + vec3(e,0.0,0.0)) - surf(position - vec3(e,0.0,0.0));
          float dy = surf(position + vec3(0.0,e,0.0)) - surf(position - vec3(0.0,e,0.0));
          float dz = surf(position + vec3(0.0,0.0,e)) - surf(position - vec3(0.0,0.0,e));
          objectNormal = normalize(objectNormal - vec3(dx, dy, dz) * ${ripple.toFixed(3)});
        }
      `)
      .replace('#include <begin_vertex>', /* glsl */ `
        vec3 transformed = position + normal * surf(position) * ${swell.toFixed(4)};
      `);
  };
  material.customProgramCacheKey = () => `liquid-${ripple}-${swell}`;
  return material;
}

/* ---------------- the room ----------------
   Chrome has no colour of its own; it is only what it reflects. A
   neutral studio HDRI gives a product-catalogue render. Long bright
   strips in a dark room give the sweeping highlights, and the two
   accent bars are what make each frame its own place. */
export function buildEnvironment(renderer, {
  accentA = 0x59e2ff,
  accentB = 0xff5fd2,
  key = 4.2,
  accentPower = 3.2,
} = {}) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x04050b);

  const bar = (w, h, pos, rot, color, power) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power) })
    );
    m.position.set(...pos);
    m.rotation.set(...rot);
    env.add(m);
  };

  const H = Math.PI / 2;
  bar(60, 9,  [0, 26, -6],  [H, 0, 0],       0xffffff, key);
  bar(46, 5,  [0, -22, 4],  [-H, 0, 0],      0xbfd4ff, key * 0.31);
  bar(7, 52,  [-30, 2, 6],  [0, H, 0],       accentA,  accentPower);
  bar(7, 52,  [30, 0, 6],   [0, -H, 0],      accentB,  accentPower * 0.82);
  bar(30, 16, [0, 6, -40],  [0, 0, 0],       0xffffff, key * 0.36);
  bar(14, 40, [-14, 8, 34], [0, Math.PI, 0], 0xffffff, key * 0.48);

  const tex = pmrem.fromScene(env, 0.03).texture;
  pmrem.dispose();
  env.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  return tex;
}

/* The three finishes the film uses. Chrome for the title, glass and
   mercury for variation across the project worlds. */
export const FINISH = {
  chrome: (envMap) => makeLiquid(new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 1.0, roughness: 0.055,
    envMap, envMapIntensity: 1.15, clearcoat: 1.0, clearcoatRoughness: 0.08,
  }), { ripple: 0.52, swell: 0.095 }),

  glass: (envMap) => makeLiquid(new THREE.MeshPhysicalMaterial({
    color: 0x0a0d18, metalness: 0.0, roughness: 0.035,
    transmission: 0.92, thickness: 3.2, ior: 1.62,
    envMap, envMapIntensity: 2.1, clearcoat: 1.0, clearcoatRoughness: 0.04,
  }), { ripple: 0.40, swell: 0.075 }),

  mercury: (envMap) => makeLiquid(new THREE.MeshPhysicalMaterial({
    color: 0xdfe9ff, metalness: 1.0, roughness: 0.16,
    envMap, envMapIntensity: 1.25,
    iridescence: 1.0, iridescenceIOR: 1.9, iridescenceThicknessRange: [120, 620],
  }), { ripple: 0.88, swell: 0.24 }),
};
