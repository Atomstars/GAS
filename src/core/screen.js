import * as THREE from 'three';

/* ==================================================================
   PROJECT SCREENS

   Each project frame carries a physical display standing in its
   world — a bezelled panel that emits its own light, catches the
   floor reflection, and leans with the pointer.

   Right now it shows a drawn placeholder. The whole point of this
   module is that the placeholder is the ONLY thing that has to
   change: give a project an `image` and the real screenshot loads
   into exactly the same panel, lighting and all. No other code moves.
================================================================== */

/* A deliberate holding image, not a broken-asset grey box. It reads as
   an interface so the composition can be judged before the real screens
   exist, and it names what it is waiting for. */
export function makePlaceholderTexture(project, accent = '#46d8ff') {
  const W = 1024, H = 640;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');

  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#080d18');
  g.addColorStop(1, '#04060e');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);

  /* window chrome */
  x.fillStyle = 'rgba(255,255,255,.045)';
  x.fillRect(0, 0, W, 58);
  x.fillStyle = accent;
  x.globalAlpha = 0.55;
  [30, 58, 86].forEach((cx, i) => {
    x.beginPath(); x.arc(cx, 29, 6, 0, 7); x.globalAlpha = 0.55 - i * 0.14; x.fill();
  });
  x.globalAlpha = 1;

  /* a sidebar and content blocks — enough structure to read as a product */
  x.fillStyle = 'rgba(255,255,255,.03)';
  x.fillRect(0, 58, 210, H - 58);
  for (let i = 0; i < 7; i++) {
    x.fillStyle = `rgba(160,200,255,${0.10 - i * 0.008})`;
    x.fillRect(28, 100 + i * 46, 150 - (i % 3) * 34, 12);
  }
  for (let r = 0; r < 3; r++) {
    for (let col = 0; col < 3; col++) {
      x.fillStyle = 'rgba(255,255,255,.035)';
      x.fillRect(250 + col * 250, 110 + r * 165, 220, 135);
      x.fillStyle = accent;
      x.globalAlpha = 0.14 + (r + col) * 0.02;
      x.fillRect(250 + col * 250, 110 + r * 165, 220, 4);
      x.globalAlpha = 1;
    }
  }

  /* what it is waiting for */
  x.fillStyle = 'rgba(235,243,255,.82)';
  x.font = '600 30px ui-monospace, Menlo, monospace';
  x.textAlign = 'center';
  x.fillText(project.name, W / 2, H - 96);
  x.fillStyle = accent;
  x.globalAlpha = 0.55;
  x.font = '500 17px ui-monospace, Menlo, monospace';
  x.fillText('SCREEN  PENDING  —  AWAITING  CAPTURE', W / 2, H - 56);
  x.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* Load a real image if the project has one; fall back to the drawn
   placeholder. This is the single seam the real screenshots come in on. */
export function loadProjectTexture(project, accent, onReady) {
  const placeholder = makePlaceholderTexture(project, accent);
  if (!project.image) return placeholder;

  new THREE.TextureLoader().load(
    project.image,
    tex => { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; onReady?.(tex); },
    undefined,
    () => { /* keep the placeholder if the capture is missing */ },
  );
  return placeholder;
}

/* ------------------------------------------------------------------
   The panel itself: bezel, screen, and the glow it throws.
------------------------------------------------------------------ */
export function makeScreen({ texture, width = 17, envMap, shellMat }) {
  const height = width * 0.625;
  const group = new THREE.Group();

  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.55, height + 0.55, 0.42),
    shellMat ?? new THREE.MeshPhysicalMaterial({
      color: 0x0b0e15, metalness: 0.92, roughness: 0.26,
      envMap, envMapIntensity: 0.85, clearcoat: 1, clearcoatRoughness: 0.18,
    }),
  );
  bezel.castShadow = true;
  bezel.receiveShadow = true;
  group.add(bezel);

  /* A display is a light source, so it is emissive rather than lit —
     that is what stops it looking like a photo glued to a board. */
  const panelMat = new THREE.MeshStandardMaterial({
    map: texture,
    emissiveMap: texture,
    emissive: 0xffffff,
    emissiveIntensity: 1.05,
    roughness: 0.28,
    metalness: 0.0,
    envMap,
    envMapIntensity: 0.35,
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), panelMat);
  panel.position.z = 0.225;
  group.add(panel);

  /* spill: the screen throws a little of its own colour into the room */
  const spill = new THREE.PointLight(0x9fd0ff, 0, 26, 2);
  spill.position.set(0, 0, 4);
  group.add(spill);

  return {
    group,
    panelMat,
    setTexture(tex) {
      panelMat.map = tex;
      panelMat.emissiveMap = tex;
      panelMat.needsUpdate = true;
    },
    update(vis, t) {
      panelMat.opacity = vis;
      panelMat.transparent = vis < 0.999;
      panelMat.emissiveIntensity = 1.05 * vis;
      spill.intensity = 14 * vis;
      /* a live display never sits perfectly still */
      group.position.y = Math.sin(t * 0.5) * 0.16;
    },
  };
}
