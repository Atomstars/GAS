import * as THREE from 'three';

/* Type that lives IN the scene rather than on top of it.

   DOM type cannot be flown through, cannot take the grade, cannot be advected by
   the gas transition and cannot receive bloom. Anything the camera has to move
   past has to be geometry, so it is drawn to a canvas and carried on a plane.

   Everything here is additive and premultiplied by its own coverage, so the
   letterforms feed bloom the way a practical light would instead of sitting on
   the frame as a flat decal. */

const DPI = 2.5;

/** Measure + draw a single line of text into a tight canvas texture. */
export function textTexture(text, {
  font = 'Syncopate, "Arial Black", sans-serif',
  weight = 700,
  size = 128,
  tracking = 0.06,
  pad = 0.35,
} = {}) {
  const c = document.createElement('canvas');
  const x = c.getContext('2d');

  const px = size * DPI;
  const spec = `${weight} ${px}px ${font}`;
  x.font = spec;
  x.letterSpacing = `${px * tracking}px`;
  const m = x.measureText(text);
  const w = Math.ceil(m.width + px * pad * 2);
  const h = Math.ceil(px * (1 + pad * 2));

  c.width = w;
  c.height = h;

  // canvas resets on resize — restore, then draw core + haloes so the glyph has
  // a falloff for bloom to catch instead of a hard aliased edge
  x.font = spec;
  x.letterSpacing = `${px * tracking}px`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  // core, then progressively wider haloes. Kept light on purpose: heavy haloes
  // fill the counters and the letterforms stop reading as type once bloom is on.
  x.globalCompositeOperation = 'lighter';
  for (const [blur, alpha] of [[0, 1], [2, 0.22], [8, 0.11], [20, 0.06]]) {
    x.filter = blur ? `blur(${blur}px)` : 'none';
    x.globalAlpha = alpha;
    x.fillStyle = '#fff';
    x.fillText(text, w / 2, h / 2);
  }
  x.filter = 'none';
  x.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;   // this is a coverage mask, not colour
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  return { texture: tex, aspect: w / h };
}

/** Draw several lines into one texture — used for blocks of body copy. */
export function paragraphTexture(lines, {
  font = '"Space Grotesk", system-ui, sans-serif',
  weight = 400,
  size = 44,
  leading = 1.62,
  tracking = 0,
  align = 'left',
  width = 0,
} = {}) {
  const c = document.createElement('canvas');
  const x = c.getContext('2d');

  const px = size * DPI;
  const spec = `${weight} ${px}px ${font}`;
  x.font = spec;
  x.letterSpacing = `${px * tracking}px`;

  const measured = Math.max(...lines.map((l) => x.measureText(l).width));
  const w = Math.ceil((width ? width * DPI : measured) + px * 1.2);
  const h = Math.ceil(px * leading * lines.length + px * 0.9);

  c.width = w;
  c.height = h;
  x.font = spec;
  x.letterSpacing = `${px * tracking}px`;
  x.textAlign = align;
  x.textBaseline = 'middle';
  x.globalCompositeOperation = 'lighter';

  const ax = align === 'center' ? w / 2 : align === 'right' ? w - px * 0.6 : px * 0.6;
  for (const [blur, alpha] of [[0, 1], [3, 0.20], [11, 0.10]]) {
    x.filter = blur ? `blur(${blur}px)` : 'none';
    x.globalAlpha = alpha;
    x.fillStyle = '#fff';
    lines.forEach((ln, i) => {
      x.fillText(ln, ax, px * 0.75 + i * px * leading);
    });
  }
  x.filter = 'none';

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  return { texture: tex, aspect: w / h };
}

const vert = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/* uWipe sweeps a lit band across the glyphs along X. That is what turns a static
   word into kinetic type: the letterforms ignite in reading order instead of
   cross-fading up as a block. uWipe < 0 means "fully lit, no wipe". */
const frag = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
uniform vec3  uColor;
uniform vec3  uHot;
uniform float uOpacity;
uniform float uWipe;
uniform float uWipeWidth;
uniform float uGlow;
varying vec2 vUv;

void main(){
  float cov = texture2D(uMap, vUv).r;
  if (cov < 0.004) discard;

  float lit = 1.0;
  float band = 0.0;
  if (uWipe >= 0.0) {
    lit  = smoothstep(uWipe + uWipeWidth, uWipe - uWipeWidth * 0.2, vUv.x);
    band = 1.0 - smoothstep(0.0, uWipeWidth, abs(vUv.x - uWipe));
  }

  // The hot core is driven by cov^3 rather than cov, so only the solid interior
  // of a glyph goes white and the antialiased edge keeps its colour. Without that
  // the halo lights up as hard as the stem and the type reads as a glowing blob.
  vec3 col = uColor * (0.30 + 0.70 * cov);
  col += uHot * pow(cov, 3.0) * uGlow;
  col += uHot * band * 1.2;                 // the leading edge of the wipe burns

  gl_FragColor = vec4(col * cov * lit * uOpacity, 1.0);
}
`;

/**
 * A line of type as a plane in the scene.
 * @returns {THREE.Mesh} with `.setOpacity()`, `.setWipe()` and a known world height.
 */
export function textPlane(text, {
  height = 1,
  color = 0x7fc4ff,
  hot = 0xffffff,
  opacity = 1,
  glow = 1.1,
  wipeWidth = 0.09,
  paragraph = null,
  ...textOpts
} = {}) {
  const { texture, aspect } = paragraph
    ? paragraphTexture(paragraph, textOpts)
    : textTexture(text, textOpts);

  const mat = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uMap: { value: texture },
      uColor: { value: new THREE.Color(color) },
      uHot: { value: new THREE.Color(hot) },
      uOpacity: { value: opacity },
      uWipe: { value: -1 },
      uWipeWidth: { value: wipeWidth },
      uGlow: { value: glow },
    },
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.scale.set(height * aspect, height, 1);
  mesh.frustumCulled = false;
  mesh.userData.aspect = aspect;
  mesh.setOpacity = (v) => { mat.uniforms.uOpacity.value = v; };
  mesh.setWipe = (v) => { mat.uniforms.uWipe.value = v; };
  mesh.setColor = (c) => { mat.uniforms.uColor.value.set(c); };
  return mesh;
}
