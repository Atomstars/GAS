import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export function createIdeaEngine(canvas, enabled, theme) {
  const host = canvas.parentElement;
  let renderer;
  const fallback = {
    setMotion() {},
    setTheme() {},
    setShape(shape) {
      host.dataset.shape = shape;
    },
  };
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
  } catch {
    host.classList.add("scene-unavailable");
    return fallback;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.setClearColor(0, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(33, 1, 0.1, 80);
  camera.position.set(0, 1, 10.8);
  camera.lookAt(0, 0, 0);
  const pmrem = new THREE.PMREMGenerator(renderer),
    room = new RoomEnvironment(),
    environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xece4ff, 0x62546c, 2.2));
  const key = new THREE.DirectionalLight(0xffdfbf, 5);
  key.position.set(-3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9d72ff, 6);
  rim.position.set(4, 0, -2);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xe5efff, 3);
  fill.position.set(-4, -2, 2);
  scene.add(fill);
  const main = new THREE.Group();
  scene.add(main);
  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xe2cfc3,
    metalness: 1,
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.15,
    iridescence: 0.7,
    iridescenceIOR: 1.45,
    iridescenceThicknessRange: [160, 480],
    envMapIntensity: 1.5,
  });
  const lavender = new THREE.MeshPhysicalMaterial({
    color: 0x9980ca,
    metalness: 0.82,
    roughness: 0.2,
    clearcoat: 1,
    iridescence: 0.45,
    envMapIntensity: 1.4,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: 0xff884e,
    metalness: 0.5,
    roughness: 0.24,
    emissive: 0xae3914,
    emissiveIntensity: 0.15,
  });
  const geometries = [];
  const geo = (g) => {
    geometries.push(g);
    return g;
  };
  const forms = {
    imagine: new THREE.Group(),
    build: new THREE.Group(),
    connect: new THREE.Group(),
  };
  Object.values(forms).forEach((g) => {
    main.add(g);
    g.visible = false;
  });
  const knot = new THREE.Mesh(
    geo(new THREE.TorusKnotGeometry(1.45, 0.44, 220, 32, 2, 3)),
    chrome,
  );
  knot.rotation.set(0.2, -0.4, 0.3);
  forms.imagine.add(knot);
  const filament = new THREE.Mesh(
    geo(new THREE.TorusKnotGeometry(1.47, 0.027, 220, 8, 2, 3)),
    accent,
  );
  filament.scale.setScalar(1.26);
  filament.rotation.copy(knot.rotation);
  forms.imagine.add(filament);
  for (let i = 0; i < 9; i++) {
    const ring = new THREE.Mesh(
      geo(new THREE.TorusGeometry(1.52, 0.12, 16, 100)),
      i % 3 === 0 ? lavender : chrome,
    );
    ring.position.z = (i - 4) * 0.27;
    ring.rotation.set(0.28 * (i - 4), 0.1 * (i - 4), 0.15);
    forms.build.add(ring);
  }
  for (let i = 0; i < 3; i++) {
    const loop = new THREE.Mesh(
      geo(new THREE.TorusGeometry(1.85, 0.16, 24, 150)),
      i === 1 ? lavender : chrome,
    );
    loop.rotation.set((i * Math.PI) / 3, (Math.PI / 3) * i, 0.5);
    forms.connect.add(loop);
  }
  const core = new THREE.Mesh(
    geo(new THREE.IcosahedronGeometry(0.68, 4)),
    chrome,
  );
  forms.connect.add(core);
  const satellites = new THREE.Group();
  main.add(satellites);
  for (let i = 0; i < 5; i++) {
    const ball = new THREE.Mesh(
      geo(new THREE.SphereGeometry(i === 0 ? 0.14 : 0.065, 18, 18)),
      i % 2 ? lavender : accent,
    );
    const angle = (i / 5) * Math.PI * 2;
    ball.position.set(
      Math.cos(angle) * 2.55,
      Math.sin(angle) * 2.35,
      ((i % 3) - 1) * 0.55,
    );
    satellites.add(ball);
  }
  let motion = enabled,
    visible = true,
    frame = 0,
    last = 0,
    time = 0,
    shape = "imagine",
    rotationX = 0,
    rotationY = 0,
    targetX = 0,
    targetY = 0,
    dragging = false,
    startX = 0,
    startY = 0,
    pulse = 0,
    disposed = false,
    transition = null,
    contextLost = false;
  forms.imagine.visible = true;
  main.rotation.z = -0.15;
  function setTheme(value) {
    theme = value;
    chrome.color.set(
      value === "light" ? 0xe2cfc3 : value === "violet" ? 0xbbb0ef : 0xb9c5de,
    );
    rim.color.set(value === "violet" ? 0xe551d4 : 0x9d72ff);
    renderer.toneMappingExposure = value === "light" ? 1.12 : 1.32;
    draw();
  }
  function resize() {
    const r = host.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / Math.max(1, r.height);
    camera.position.z = r.width / r.height < 0.8 ? 12.8 : 10.8;
    camera.updateProjectionMatrix();
    draw();
  }
  function draw() {
    if (!disposed) renderer.render(scene, camera);
  }
  function tick(now) {
    frame = 0;
    if (disposed || contextLost || !motion || !visible || document.hidden)
      return;
    const dt = Math.min((now - last) / 1000, 0.04);
    last = now;
    time += dt;
    rotationX += (targetX - rotationX) * 0.07;
    rotationY += (targetY - rotationY) * 0.07;
    main.rotation.x = rotationX + Math.sin(time * 0.27) * 0.1;
    main.rotation.y = rotationY + time * 0.095;
    main.position.y = Math.sin(time * 0.65) * 0.08;
    pulse *= 0.92;
    let scale = 1 + pulse;
    if (transition) {
      transition.elapsed += dt;
      const t = transition.elapsed;
      if (t >= 0.16 && !transition.changed) {
        Object.entries(forms).forEach(
          ([id, g]) => (g.visible = id === transition.target),
        );
        transition.changed = true;
      }
      scale =
        t < 0.16
          ? 1 - 0.2 * (t / 0.16)
          : 0.8 + 0.2 * Math.min(1, (t - 0.16) / 0.3);
      if (t >= 0.46) transition = null;
    }
    main.scale.setScalar(scale);
    satellites.rotation.z = -time * 0.1;
    draw();
    frame = requestAnimationFrame(tick);
  }
  function schedule() {
    if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    if (motion && visible && !document.hidden && !contextLost) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    } else draw();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const intersection = new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
      schedule();
    },
    { threshold: 0.01 },
  );
  intersection.observe(host);
  const visibility = () => schedule();
  document.addEventListener("visibilitychange", visibility);
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add("dragging");
    pulse = 0.05;
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    targetY += (e.clientX - startX) * 0.009;
    targetX = Math.max(
      -0.8,
      Math.min(0.8, targetX + (e.clientY - startY) * 0.005),
    );
    startX = e.clientX;
    startY = e.clientY;
    if (!motion) {
      main.rotation.y = targetY;
      main.rotation.x = targetX;
      draw();
    }
  });
  const end = () => {
    dragging = false;
    canvas.classList.remove("dragging");
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("lostpointercapture", end);
  canvas.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key))
      return;
    e.preventDefault();
    if (e.key === "ArrowLeft") targetY -= 0.3;
    if (e.key === "ArrowRight") targetY += 0.3;
    if (e.key === "ArrowUp") targetX -= 0.2;
    if (e.key === "ArrowDown") targetX += 0.2;
    if (!motion) {
      main.rotation.y = targetY;
      main.rotation.x = targetX;
      draw();
    }
  });
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    contextLost = true;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    host.classList.add("scene-unavailable");
  });
  canvas.addEventListener("webglcontextrestored", () => {
    contextLost = false;
    host.classList.remove("scene-unavailable");
    draw();
    schedule();
  });
  host.classList.add("scene-ready");
  setTheme(theme);
  resize();
  schedule();
  return {
    setMotion(value) {
      motion = value;
      if (!motion) {
        pulse = 0;
        main.scale.setScalar(1);
        if (transition) {
          Object.entries(forms).forEach(
            ([id, g]) => (g.visible = id === transition.target),
          );
          transition = null;
        }
      }
      schedule();
    },
    setTheme,
    setShape(value) {
      if (!forms[value]) return;
      shape = value;
      if (motion) {
        transition = { target: shape, elapsed: 0, changed: false };
      } else {
        Object.entries(forms).forEach(([id, g]) => (g.visible = id === shape));
      }
      pulse = 0;
      host.dataset.shape = shape;
      draw();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      geometries.forEach((g) => g.dispose());
      [chrome, lavender, accent].forEach((m) => m.dispose());
      environment.dispose();
      renderer.dispose();
    },
  };
}
