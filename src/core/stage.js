import * as THREE from 'three';

/* ==================================================================
   THE STAGE
   What separates a 3D object from a 3D *scene* is almost never the
   object. It is the floor it stands on, the shadow it throws, the
   air between it and the camera, and the light you can see travelling
   through that air. Without those an object floats in a void and
   reads as a render; with them it reads as a place.

   Every frame builds one of these.
================================================================== */

/* Volumetric shafts. Real godrays would mean marching the light per
   pixel; cones of graded additive haze cost almost nothing and, once
   there is dust drifting inside them, sell the same thing. */
const SHAFT_VS = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vUv = uv;
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const SHAFT_FS = /* glsl */ `
  uniform vec3  uColor;
  uniform float uIntensity;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    /* brightest at the source, gone before it reaches the floor */
    float drop = pow(1.0 - vUv.y, 1.9);

    /* a shaft is thickest through its middle, so it must be softest
       where we see it edge-on — otherwise the cone silhouette shows */
    float facing = abs(dot(normalize(vN), normalize(vV)));
    float body = pow(1.0 - facing, 1.35);

    float flicker = 0.92 + 0.08 * sin(uTime * 0.7 + vUv.y * 3.0);

    float a = drop * body * uIntensity * flicker;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

function makeShafts(color, count, { height = 46, spread = 26, intensity = 0.30 }) {
  const group = new THREE.Group();
  const uniforms = [];
  for (let i = 0; i < count; i++) {
    const u = {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity * (0.6 + Math.random() * 0.8) },
      uTime: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: u, vertexShader: SHAFT_VS, fragmentShader: SHAFT_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide, fog: false,
    });
    const topR = 1.4 + Math.random() * 1.6;
    const botR = topR + 5 + Math.random() * 7;
    const cone = new THREE.Mesh(
      new THREE.CylinderGeometry(topR, botR, height, 26, 1, true), mat);
    cone.position.set(
      (Math.random() - 0.5) * spread,
      height * 0.5 - 4,
      (Math.random() - 0.5) * spread * 0.7,
    );
    cone.rotation.z = (Math.random() - 0.5) * 0.28;
    cone.rotation.x = (Math.random() - 0.5) * 0.20;
    cone.renderOrder = 5;
    group.add(cone);
    uniforms.push(u);
  }
  group.userData.uniforms = uniforms;
  return group;
}

/* Dust is the cheapest realism there is: it gives the air volume and
   proves the light shafts are passing through something. */
function makeDust(count, spread, color) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const scale = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * spread;
    pos[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.55 + 2;
    pos[i * 3 + 2] = (Math.random() - 0.5) * spread * 0.8;
    seed[i] = Math.random() * 100;
    scale[i] = 0.4 + Math.random() * 1.5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aScale', new THREE.BufferAttribute(scale, 1));

  const uniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 1 },
    uColor: { value: new THREE.Color(color) },
    uPixelRatio: { value: Math.min(devicePixelRatio, 2) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false,
    vertexShader: /* glsl */ `
      attribute float aSeed; attribute float aScale;
      uniform float uTime, uPixelRatio;
      varying float vA;
      void main() {
        vec3 p = position;
        p.y += sin(uTime * 0.22 + aSeed) * 1.6 + mod(uTime * 0.35 + aSeed, 1.0) * 0.4;
        p.x += sin(uTime * 0.17 + aSeed * 1.7) * 1.1;
        p.z += cos(uTime * 0.13 + aSeed * 2.3) * 1.1;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(aScale * uPixelRatio * (26.0 / max(-mv.z, 0.001)), 0.6, 6.0);
        vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 0.9 + aSeed * 3.0));
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; uniform vec3 uColor;
      varying float vA;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = dot(d, d) * 4.0;
        if (r > 1.0) discard;
        float a = pow(1.0 - r, 2.0) * vA * uOpacity;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.userData.uniforms = uniforms;
  return pts;
}

/* ------------------------------------------------------------------
   A stage: floor, air, and light you can see.
------------------------------------------------------------------ */
export function makeStage({
  envMap,
  accent = 0x8fb8ff,
  groundY = -14,
  groundSize = 150,
  shafts = 3,
  shaftIntensity = 0.30,
  dust = 420,
  dustSpread = 60,
} = {}) {
  const stage = new THREE.Group();

  /* Polished floor. Metalness plus a low roughness makes it read as wet
     stone rather than a grey card, and it is what catches the shadow. */
  /* The floor must stay darker than the subject. At a high envMap
     intensity it mirrors the whole bright room, ends up brighter than
     the object standing on it, and swallows the shadow — which is the
     one thing it is there to show. */
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x02030a,
    roughness: 0.44,
    metalness: 0.72,
    envMap,
    envMapIntensity: 0.20,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, groundSize), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = groundY;
  ground.receiveShadow = true;
  stage.add(ground);

  const shaftGroup = makeShafts(accent, shafts, {
    height: Math.abs(groundY) * 3.2,
    spread: 30,
    intensity: shaftIntensity,
  });
  shaftGroup.position.y = groundY;
  stage.add(shaftGroup);

  const dustPts = makeDust(dust, dustSpread, accent);
  stage.add(dustPts);

  const shaftU = shaftGroup.userData.uniforms;
  const dustU = dustPts.userData.uniforms;

  return {
    group: stage,
    ground,
    setOpacity(v) {
      groundMat.opacity = v;
      groundMat.transparent = v < 0.999;
      for (const u of shaftU) u.uIntensity.value = u.uIntensity.value; // held; scaled via master below
      dustU.uOpacity.value = v;
      stage.visible = v > 0.003;
    },
    update(t, vis = 1, sweep = 0) {
      dustU.uTime.value = t;
      dustU.uOpacity.value = vis;
      shaftU.forEach((u, i) => {
        u.uTime.value = t;
        /* shafts flare during a transition — light sweeping the lens */
        u.uIntensity.value = (shaftIntensity * (0.55 + 0.45 * Math.sin(t * 0.3 + i)) + sweep * 0.9) * vis;
      });
      groundMat.opacity = vis;
      groundMat.transparent = vis < 0.999;
      stage.visible = vis > 0.003;
    },
    setPixelRatio(pr) { dustU.uPixelRatio.value = pr; },
  };
}
