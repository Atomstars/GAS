/* THE ATMOSPHERE — a live WebGL layer behind the whole page.

   ── Why this exists, and why it is ONE pass ──

   The first version of this site was a 3D film with no content. The second was content
   with no film. Both were wrong for the same reason: they treated depth and substance
   as a trade. They are not. The page keeps its structure — sticky spec column, chapter
   frames, real copy — and this runs behind all of it, permanently, so every frame has
   atmosphere and motion under it.

   The perf lesson from the film is baked in. That build drew thirty overlapping
   full-screen transparent planes, each running a multi-octave noise, and measured
   3.15ms per frame against 0.38 for the next-heaviest scene — eight times the cost of
   anything else, purely in overdraw. This is ONE fullscreen triangle at half
   resolution: no overdraw, no depth buffer, no scene graph, one draw call. Raw WebGL2
   rather than three.js, because a single quad does not need a renderer and the library
   is 600KB the page would otherwise pay for on first paint.

   It reacts to three things — scroll position, scroll velocity and the pointer — so it
   is never playing the same frame twice, and it takes its colour from whichever
   project is on screen. */

const VERT = `#version 300 es
/* A single oversized triangle rather than a quad. Two triangles share an edge, and
   fragments along that edge get shaded twice on some tilers; one triangle that
   overhangs the viewport has no seam and one less vertex. */
const vec2 P[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
out vec2 vUv;
void main(){
  vec2 p = P[gl_VertexID];
  vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform float uScroll;     // 0..1 down the document
uniform float uVel;        // 0..1 normalised scroll speed
uniform vec2  uPointer;    // 0..1 screen space
uniform vec3  uAccent;     // the colour of the project currently on screen

in vec2 vUv;
out vec4 frag;

/* Cheap value noise. Simplex is nicer and costs about three times as much; at the
   scale this is drawn — soft volumes filling the screen — the difference is not
   visible and the cost is the whole budget. */
float hash(vec3 p){
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x){
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                 mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                 mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++){ s += a * noise(p); p *= 2.03; a *= 0.5; }
  return s;
}

void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);

  /* THE FLIGHT. Scroll drives depth, not just vertical offset — the field is sampled
     further along z as you descend the page, so the atmosphere is something you move
     THROUGH rather than something that slides past. That is the single difference
     between a parallax background and a camera. */
  /* The time term is not decoration. Scroll alone means the field is frozen whenever
     the reader is, and a frozen background is a wallpaper — the whole point is that
     this is a place that carries on existing while you read. */
  float z = uScroll * 7.0 + uTime * 0.055;

  // domain warp, so the volume churns instead of translating
  vec2 w = vec2(fbm(vec3(p * 1.6, z * 0.7)), fbm(vec3(p * 1.6 + 4.1, z * 0.7)));
  float d = fbm(vec3(p * 2.1 + w * 0.55, z));

  /* Pointer as a light source. Not a spotlight pasted on top — it feeds the density
     falloff, so the volume genuinely brightens where it is thin near the cursor and
     stays dark where it is thick. */
  vec2 lp = (uPointer - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float lit = 1.0 - smoothstep(0.0, 0.95, length(p - lp));
  lit = pow(lit, 2.2);

  /* Depth banding. Two evaluations at different scales, the far one desaturated and
     dimmer, is enough to read as layered distance without a second noise budget. */
  float far = fbm(vec3(p * 0.85 - w * 0.2, z * 0.45 + 9.0));

  /* These four numbers are the whole look, and the first pass had them all at about a
     third of this. The result was technically a volumetric field and visually a flat
     dark rectangle — present in the frame, invisible in it, which is the same failure
     the earlier builds kept making in different materials.

     It still has to sit UNDER type, so the ceiling is set by legibility rather than by
     taste: the brightest the field goes is well below the body-copy grey. */
  vec3 deep = vec3(0.026, 0.030, 0.040);
  vec3 mid  = mix(deep, uAccent * 0.42, 0.75);
  vec3 hot  = mix(uAccent, vec3(1.0), 0.30);

  vec3 col = deep;
  col = mix(col, mid, smoothstep(0.30, 0.80, far) * 0.95);
  col = mix(col, mid * 2.3, smoothstep(0.38, 0.86, d) * 0.85);
  col += hot * lit * (0.09 + d * 0.34);

  // scroll velocity streaks the field vertically — the frame reacts to being moved
  float streak = uVel * smoothstep(0.2, 0.9, fbm(vec3(p.x * 3.0, p.y * 0.35 - z * 2.0, z)));
  col += uAccent * streak * 0.34;

  // a slow vignette so the type always has a darker field under it at the edges
  col *= 1.0 - 0.5 * pow(length(uv - 0.5) * 1.35, 2.4);

  // fine grain, dithered against banding in the dark end where it is very visible
  float g = hash(vec3(gl_FragCoord.xy, floor(uTime * 24.0)));
  col += (g - 0.5) * 0.016;

  frag = vec4(max(col, 0.0), 1.0);
}`;

const hexToRgb = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/**
 * Start the atmosphere. Returns a handle the page uses to tell it what is on screen,
 * or null if WebGL2 is unavailable — in which case the CSS background stands in and
 * nothing else on the page cares.
 */
export function startAtmosphere(canvas) {
  const gl = canvas.getContext('webgl2', {
    antialias: false, depth: false, stencil: false, alpha: false,
    powerPreference: 'high-performance',
  });
  if (!gl) return null;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('atmosphere:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('atmosphere:', gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);

  const u = {};
  for (const name of ['uRes', 'uTime', 'uScroll', 'uVel', 'uPointer', 'uAccent']) {
    u[name] = gl.getUniformLocation(prog, name);
  }
  // a VAO is required in WebGL2 even with no attributes
  gl.bindVertexArray(gl.createVertexArray());

  /* Half resolution, upscaled by CSS. This is a field of soft volumes with no detail
     to lose, and a full-screen shader is the one thing here that scales with pixel
     count — quartering it is the difference between comfortable and marginal on an
     integrated GPU. */
  const SCALE = 0.5;
  let w = 0;
  let h = 0;
  const resize = () => {
    w = Math.max(1, Math.floor(innerWidth * SCALE));
    h = Math.max(1, Math.floor(innerHeight * SCALE));
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
  };
  resize();
  addEventListener('resize', resize);

  const accent = hexToRgb('#60a5fa');
  const target = accent.slice();
  const pointer = [0.5, 0.42];
  const pTarget = [0.5, 0.42];
  let scroll = 0;
  let vel = 0;
  let velTarget = 0;
  let lastScroll = 0;
  let running = true;

  addEventListener('pointermove', (e) => {
    pTarget[0] = e.clientX / innerWidth;
    pTarget[1] = 1 - e.clientY / innerHeight;
  }, { passive: true });

  /* Stop entirely when the tab is hidden. rAF is throttled rather than stopped in some
     browsers, and a shader that keeps running behind a hidden tab is pure battery. */
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(frame);
  });

  let t0 = performance.now();
  let prev = t0;

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;

    const max = document.documentElement.scrollHeight - innerHeight;
    const s = max > 0 ? scrollY / max : 0;
    velTarget = Math.min(1, Math.abs(s - lastScroll) / (dt || 0.016) / 0.9);
    lastScroll = s;

    // everything eases toward its target, so nothing in the frame can ever jump
    const k = 1 - Math.exp(-dt * 6);
    scroll += (s - scroll) * k;
    vel += (velTarget - vel) * (1 - Math.exp(-dt * (velTarget > vel ? 10 : 3)));
    pointer[0] += (pTarget[0] - pointer[0]) * k;
    pointer[1] += (pTarget[1] - pointer[1]) * k;
    for (let i = 0; i < 3; i++) accent[i] += (target[i] - accent[i]) * (1 - Math.exp(-dt * 2.2));

    gl.uniform2f(u.uRes, w, h);
    gl.uniform1f(u.uTime, (now - t0) / 1000);
    gl.uniform1f(u.uScroll, scroll);
    gl.uniform1f(u.uVel, vel);
    gl.uniform2f(u.uPointer, pointer[0], pointer[1]);
    gl.uniform3f(u.uAccent, accent[0], accent[1], accent[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  requestAnimationFrame(frame);

  return {
    /** The atmosphere takes the colour of whichever project is on screen. */
    setAccent(hex) {
      const c = hexToRgb(hex);
      target[0] = c[0]; target[1] = c[1]; target[2] = c[2];
    },
  };
}
