/* Dev-only review harness. Not shipped — main.js imports it behind import.meta.env.DEV.

   The look IS the product here, so it has to be reviewed as frames. This renders
   the film deterministically at an arbitrary scroll position, independent of
   requestAnimationFrame (which is throttled when the tab isn't compositing), reads
   the pixels back off the GL buffer and posts them to the dev frame sink in
   vite.config.js. It also reports coverage stats, so "is this frame actually black?"
   is a measurement rather than an opinion. */

import { GasTransition } from '../core/GasTransition.js';

export function installHarness(ctx) {
  const { renderer, shots, post, gas, overlay } = ctx;

  /** Advance the film to global progress P and render one deterministic frame. */
  function step(P, { warm = 48, t0 = 6.0, dt = 1 / 60 } = {}) {
    let t = t0;
    let r = null;
    for (let i = 0; i < warm; i++) {
      t += dt;
      r = shots.update(P, dt, t);
      let turbulence = 0;
      if (r.mix === null) {
        post.setScene(r.from.scene, r.from.camera);
        post.setGrade(r.from.grade);
      } else {
        turbulence = GasTransition.envelope(r.mix);
        gas.capture(r.from, r.to);
        gas.set(r.mix, t, r.mix < 0.5 ? r.from.edgeColor : r.to.edgeColor);
        post.setScene(gas.scene, gas.camera);
        post.setGrade(r.mix < 0.5 ? r.from.grade : r.to.grade);
      }
      post.setTurbulence(turbulence);
      post.update(dt);
      if (i === warm - 1) {
        post.render();
        overlay.update(P, r, turbulence);
      }
    }
    return r;
  }

  /** Read the drawing buffer back, flipped, plus luminance coverage. */
  function readback(outWidth) {
    const gl = renderer.getContext();
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);

    let lit = 0;
    let sum = 0;
    let hot = 0;
    for (let i = 0; i < buf.length; i += 4) {
      const l = (buf[i] * 0.2126 + buf[i + 1] * 0.7152 + buf[i + 2] * 0.0722) / 255;
      sum += l;
      if (l > 0.06) lit++;
      if (l > 0.65) hot++;
    }
    const n = buf.length / 4;

    const src = document.createElement('canvas');
    src.width = w; src.height = h;
    const sx = src.getContext('2d');
    const img = sx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      const s = (h - 1 - y) * w * 4;
      img.data.set(buf.subarray(s, s + w * 4), y * w * 4);
    }
    sx.putImageData(img, 0, 0);

    const ow = outWidth;
    const out = document.createElement('canvas');
    out.width = ow;
    out.height = Math.round((ow * h) / w);
    out.getContext('2d').drawImage(src, 0, 0, out.width, out.height);

    return {
      png: out.toDataURL('image/png').split(',')[1],
      lit: +(lit / n).toFixed(3),
      hot: +(hot / n).toFixed(4),
      meanLum: +(sum / n).toFixed(4),
    };
  }

  /** Render at P, write .frames/<name>.png, return the stats. */
  async function shoot(P, name = `p${P}`, opts = {}) {
    const r = step(P, opts);
    const { png, ...stats } = readback(opts.w || 760);
    await fetch(`/__shot?name=${encodeURIComponent(name)}`, { method: 'POST', body: png });
    return {
      name,
      P,
      shot: r.from.id,
      to: r.to?.id ?? null,
      mix: r.mix === null ? null : +r.mix.toFixed(2),
      ...stats,
    };
  }

  /** Shoot a whole contact sheet across the film. */
  async function sheet(list) {
    const out = [];
    for (const item of list) {
      const [P, name, opts] = Array.isArray(item) ? item : [item, `p${item}`, {}];
      out.push(await shoot(P, name, opts));
    }
    return out;
  }

  /** Put the film in the state the opening tweens would have left it in. */
  function settle() {
    post.fade = 1;
    const title = shots.shots.find((s) => s.id === 'title');
    if (title) { title.revealed = true; title.cond = 1; }
    document.body.classList.add('ready', 'title-in');
  }

  settle();
  Object.assign(window.__GAS, { step, shoot, sheet, settle });
}
