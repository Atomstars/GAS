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

  /* ---------------------------------------------------------------------
     Live-loop driving.

     `step` above bypasses Lenis and the velocity smear, so it can prove a shot
     looks right but not that the SITE works. These drive the real `tick` from
     main.js — same Lenis instance, same smear, same transition scheduling —
     with a synthetic clock, because rAF is throttled to zero whenever the
     browser pane isn't compositing.
     --------------------------------------------------------------------- */

  const { tick } = ctx;
  let clockMs = 0;

  /** Run the shipped loop for `frames` at a fixed dt, collecting a trace. */
  function pump(frames, { fps = 60, sample = null } = {}) {
    const dt = 1 / fps;
    const trace = [];
    for (let i = 0; i < frames; i++) {
      clockMs += dt * 1000;
      const s = tick(clockMs, dt);
      if (sample && i % sample === 0) {
        trace.push({
          P: +s.P.toFixed(4),
          y: Math.round(scrollY),
          shot: s.r.from.id,
          mix: s.r.mix === null ? null : +s.r.mix.toFixed(2),
          vel: +s.vel.toFixed(3),
          turb: +s.turbulence.toFixed(3),
        });
      }
    }
    return trace;
  }

  /** Simulate a real wheel flick and watch Lenis carry it. */
  function flick(deltaY = 900, frames = 90) {
    dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }));
    return pump(frames, { sample: 6 });
  }

  /** Scroll the whole film at a given pace and report anything that broke. */
  async function fly({ seconds = 26, fps = 60 } = {}) {
    const max = document.documentElement.scrollHeight - innerHeight;
    const frames = Math.round(seconds * fps);
    const errors = [];
    const onErr = (e) => errors.push(String(e.error?.stack || e.message));
    addEventListener('error', onErr);

    const trace = [];
    const before = renderer.info.render.frame;
    for (let i = 0; i < frames; i++) {
      // ease the wheel in and out so the velocity smear sees a real ramp
      const u = i / (frames - 1);
      const target = max * u;
      ctx.lenis.scrollTo(target, { immediate: false, duration: 0.35, lock: false });
      clockMs += (1000 / fps);
      const s = tick(clockMs, 1 / fps);
      trace.push({
        P: s.P, shot: s.r.from.id, to: s.r.to?.id ?? null,
        mix: s.r.mix, vel: s.vel, turb: s.turbulence,
      });
    }
    removeEventListener('error', onErr);

    // fold the per-frame trace into one row per shot / per transition
    const rows = [];
    for (const f of trace) {
      const key = f.mix === null ? f.shot : `${f.shot}->${f.to}`;
      const last = rows[rows.length - 1];
      if (last && last.key === key) {
        last.frames++;
        last.maxVel = Math.max(last.maxVel, f.vel);
        last.maxTurb = Math.max(last.maxTurb, f.turb);
        last.pEnd = f.P;
      } else {
        rows.push({ key, frames: 1, pStart: f.P, pEnd: f.P, maxVel: f.vel, maxTurb: f.turb });
      }
    }
    return {
      renderedFrames: renderer.info.render.frame - before,
      errors,
      rows: rows.map((r) => ({
        key: r.key,
        frames: r.frames,
        p: `${r.pStart.toFixed(3)}-${r.pEnd.toFixed(3)}`,
        maxVel: +r.maxVel.toFixed(3),
        maxTurb: +r.maxTurb.toFixed(3),
      })),
    };
  }

  /** Put the film in the state the opening tweens would have left it in. */
  function settle() {
    post.fade = 1;
    const title = shots.shots.find((s) => s.id === 'title');
    if (title) { title.revealed = true; title.cond = 1; }
    document.body.classList.add('ready', 'title-in');
  }

  settle();
  Object.assign(window.__GAS, { step, shoot, sheet, settle, pump, flick, fly, readback });
}
