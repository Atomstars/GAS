import * as THREE from 'three';

/* ==================================================================
   THE POINTER
   Mouse and finger are the same thing here. Every frame reads this:
   the gas is pushed by it, the liquid surface ripples from it, and
   objects lean toward it. Moving is the only interaction in the film
   — there is still nothing to click.
================================================================== */

export class Pointer {
  constructor(camera) {
    this.camera = camera;

    this.ndc = new THREE.Vector2(0, 0);      // -1..1
    this.smooth = new THREE.Vector2(0, 0);   // damped, for parallax
    this.world = new THREE.Vector3(0, 0, 999);
    this.speed = 0;      // how fast it is moving, 0..1
    this.active = 0;     // 1 while engaged, decays when idle

    this._plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this._ray = new THREE.Raycaster();
    this._rawSpeed = 0;

    const set = (x, y) => {
      const nx = (x / innerWidth) * 2 - 1;
      const ny = -((y / innerHeight) * 2 - 1);
      this._rawSpeed += Math.hypot(nx - this.ndc.x, ny - this.ndc.y) * 7;
      this.ndc.set(nx, ny);
      this.active = 1;
    };

    addEventListener('pointermove', e => set(e.clientX, e.clientY), { passive: true });
    addEventListener('pointerdown', e => { set(e.clientX, e.clientY); this._rawSpeed += 1.4; }, { passive: true });
    addEventListener('touchmove', e => {
      const t = e.touches[0];
      if (t) set(t.clientX, t.clientY);
    }, { passive: true });
  }

  /* Project onto the plane the current frame's subject lives on, so the
     ripple lands where the viewer is actually pointing in the scene. */
  setFocusPlane(z) { this._plane.constant = -z; }

  update(dt) {
    this.smooth.x += (this.ndc.x - this.smooth.x) * (1 - Math.exp(-dt * 3.2));
    this.smooth.y += (this.ndc.y - this.smooth.y) * (1 - Math.exp(-dt * 3.2));

    this._rawSpeed *= Math.exp(-dt * 3.4);
    this.speed = Math.min(1, this._rawSpeed);

    /* Idle pointers stop rippling — the surface should settle when the
       viewer is just reading. */
    this.active *= Math.exp(-dt * 0.85);

    this._ray.setFromCamera(this.ndc, this.camera);
    if (!this._ray.ray.intersectPlane(this._plane, this.world)) {
      this.world.set(0, 0, 999);
    }
    return this;
  }

  /* Amplitude the liquid materials use for their ripple. */
  get rippleAmp() {
    return Math.min(1.6, this.active * (0.35 + this.speed * 1.5));
  }
}
