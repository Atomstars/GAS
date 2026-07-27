/* ==================================================================
   THE DIRECTOR
   Owns the single number the whole film is a function of: P ∈ [0,1].

   Scroll is throttle, not position. Input adds to a target, the target
   is chased with exponential damping, and the resulting velocity is
   published so frames can react to how *hard* the viewer is travelling
   — speed changes the lens, not just the position.

   Nothing in this film is click-driven. Wheel, trackpad (both axes),
   touch and arrow keys all feed the same throttle.
================================================================== */

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

export class Director {
  constructor({
    sensitivity = 0.00016,
    touchSensitivity = 0.0011,
    keyStep = 0.02,
    damping = 3.4,
  } = {}) {
    this.P = 0;
    this.targetP = 0;
    this.velocity = 0;      // smoothed dP/dt
    this.rawVelocity = 0;
    this.damping = damping;
    this.beats = [];
    this._locked = false;

    const push = d => {
      if (this._locked) return;
      this.targetP = clamp01(this.targetP + d);
    };

    addEventListener('wheel', e => {
      /* deltaX included so a horizontal trackpad flick also flies the route */
      push((e.deltaY + e.deltaX * 0.6) * sensitivity);
    }, { passive: true });

    let touchY = null, touchX = null;
    addEventListener('touchstart', e => {
      touchY = e.touches[0].clientY;
      touchX = e.touches[0].clientX;
    }, { passive: true });
    addEventListener('touchmove', e => {
      if (touchY === null) return;
      const y = e.touches[0].clientY, x = e.touches[0].clientX;
      push(((touchY - y) + (touchX - x) * 0.5) * touchSensitivity);
      touchY = y; touchX = x;
    }, { passive: true });
    addEventListener('touchend', () => { touchY = touchX = null; }, { passive: true });

    addEventListener('keydown', e => {
      const k = e.key;
      if (k === 'ArrowDown' || k === 'ArrowRight' || k === 'PageDown' || k === ' ') push(keyStep);
      if (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'PageUp') push(-keyStep);
      if (k === 'Home') this.targetP = 0;
      if (k === 'End') this.targetP = 1;
    });
  }

  /* Freeze input — used while a title holds, so a heavy scroll can't
     blow straight through a beat the viewer is meant to read. */
  lock()   { this._locked = true; }
  unlock() { this._locked = false; }

  /* A frame declares the stretch of the journey it owns. */
  beat(id, p0, p1, handlers = {}) {
    this.beats.push({ id, p0, p1, inside: false, ...handlers });
    return this;
  }

  update(dt) {
    const prev = this.P;
    this.P += (this.targetP - this.P) * (1 - Math.exp(-dt * this.damping));

    this.rawVelocity = dt > 0 ? (this.P - prev) / dt : 0;
    this.velocity += (this.rawVelocity - this.velocity) * (1 - Math.exp(-dt * 6));

    for (const b of this.beats) {
      const inside = this.P >= b.p0 && this.P <= b.p1;
      if (inside && !b.inside) { b.inside = true;  b.onEnter?.(this); }
      if (!inside && b.inside) { b.inside = false; b.onExit?.(this); }
      if (inside) {
        const t = b.p1 === b.p0 ? 0 : (this.P - b.p0) / (b.p1 - b.p0);
        b.onUpdate?.(t, this);
      }
    }
    return this.P;
  }
}
