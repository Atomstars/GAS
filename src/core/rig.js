import * as THREE from 'three';

/* ==================================================================
   THE CAMERA RIG
   A camera operator, not a slider. It moves along a Catmull-Rom spline
   so velocity is continuous through every keyframe — the camera never
   stops at a waypoint unless we explicitly ask it to hold. On top of
   the path it banks, breathes, racks focus and changes focal length.

   The whole film is one unbroken take, so this rig is never rebuilt:
   frames only append keyframes to it.
================================================================== */

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = t => t * t * (3 - 2 * t);

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

/* A keyframed track. Values may be numbers or Vector3.
   `hold: true` on a keyframe eases into it, so the camera settles
   instead of sailing through — used when a frame needs to breathe. */
class Track {
  constructor(vector = false) {
    this.keys = [];
    this.vector = vector;
    this._out = vector ? new THREE.Vector3() : 0;
  }

  add(p, value, opts = {}) {
    this.keys.push({ p, v: value, hold: !!opts.hold });
    this.keys.sort((a, b) => a.p - b.p);
    return this;
  }

  sample(P) {
    const k = this.keys;
    if (!k.length) return this.vector ? this._out.set(0, 0, 0) : 0;
    if (k.length === 1 || P <= k[0].p) return this._copy(k[0].v);
    if (P >= k[k.length - 1].p) return this._copy(k[k.length - 1].v);

    let i = 0;
    for (; i < k.length - 1; i++) if (P >= k[i].p && P <= k[i + 1].p) break;

    const a = k[i], b = k[i + 1];
    let t = b.p === a.p ? 0 : (P - a.p) / (b.p - a.p);
    /* Ease only where a hold was asked for — easing everywhere would make
       every keyframe a full stop, which is exactly the robotic look. */
    if (a.hold || b.hold) t = smooth(t);

    const p0 = k[Math.max(0, i - 1)].v;
    const p3 = k[Math.min(k.length - 1, i + 2)].v;

    if (this.vector) {
      return this._out.set(
        catmull(p0.x, a.v.x, b.v.x, p3.x, t),
        catmull(p0.y, a.v.y, b.v.y, p3.y, t),
        catmull(p0.z, a.v.z, b.v.z, p3.z, t),
      );
    }
    return catmull(p0, a.v, b.v, p3, t);
  }

  _copy(v) { return this.vector ? this._out.copy(v) : v; }
}

export class CameraRig {
  constructor(camera) {
    this.camera = camera;

    this.path  = new Track(true);   // where the camera is
    this.aim   = new Track(true);   // what it is looking at
    this.roll  = new Track();       // bank, radians
    this.fov   = new Track();       // focal length
    this.focus = new Track();       // rack focus distance; <0 = autofocus

    /* handheld — a real operator is never perfectly still */
    this.breath = 0.5;
    this.swayAmount = 1.0;

    /* Additive offsets a frame can drive on its own clock — used for
       moves that are not on the scroll, like an opening push-in. */
    this.offset = new THREE.Vector3();
    this.fovOffset = 0;

    this._shake = 0;
    this._pos = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._sway = new THREE.Vector3();
    this._parallax = { x: 0, y: 0, tx: 0, ty: 0 };
  }

  /* Declarative keyframe: everything a shot needs in one call. */
  key(p, { pos, look, roll = 0, fov = 46, focus = -1, hold = false } = {}) {
    if (pos)  this.path.add(p, pos, { hold });
    if (look) this.aim.add(p, look, { hold });
    this.roll.add(p, roll, { hold });
    this.fov.add(p, fov, { hold });
    this.focus.add(p, focus, { hold });
    return this;
  }

  /* Camera kick — for impacts, ignitions, jumps to light speed. */
  impulse(amount = 1) { this._shake = Math.min(2.5, this._shake + amount); }

  /* Pointer parallax: the world should acknowledge the viewer slightly. */
  setPointer(nx, ny) { this._parallax.tx = nx; this._parallax.ty = ny; }

  update(P, dt, t) {
    const cam = this.camera;

    this._pos.copy(this.path.sample(P));
    this._look.copy(this.aim.sample(P));

    /* --- handheld breathing: irrational frequency ratios so the loop
           never becomes audible to the eye --- */
    const b = this.breath;
    this._sway.set(
      (Math.sin(t * 0.43) * 0.55 + Math.sin(t * 1.13 + 1.7) * 0.22) * b,
      (Math.sin(t * 0.31 + 2.1) * 0.48 + Math.sin(t * 0.97 + 0.4) * 0.18) * b,
      (Math.sin(t * 0.27 + 4.2) * 0.30) * b,
    );

    /* --- decaying shake --- */
    if (this._shake > 0.0001) {
      const s = this._shake;
      this._sway.x += (Math.random() - 0.5) * s * 0.9;
      this._sway.y += (Math.random() - 0.5) * s * 0.9;
      this._shake *= Math.exp(-dt * 6.0);
    }

    cam.position.copy(this._pos).add(this._sway).add(this.offset);

    /* --- pointer parallax, damped so it feels like weight, not a cursor --- */
    const px = this._parallax;
    px.x += (px.tx - px.x) * (1 - Math.exp(-dt * 3.2));
    px.y += (px.ty - px.y) * (1 - Math.exp(-dt * 3.2));
    this._look.x += px.x * 1.6 * this.swayAmount;
    this._look.y += px.y * 1.0 * this.swayAmount;

    /* --- focal length --- */
    const fov = this.fov.sample(P) + this.fovOffset;
    if (Math.abs(cam.fov - fov) > 0.001) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }

    cam.lookAt(this._look);

    /* --- bank: roll about the view axis, after aiming --- */
    const roll = this.roll.sample(P) + Math.sin(t * 0.21) * 0.006 * this.breath;
    if (roll !== 0) cam.rotateZ(roll);

    /* --- rack focus: explicit distance, or lock onto what we're aiming at --- */
    const f = this.focus.sample(P);
    this.focusDistance = f > 0 ? f : cam.position.distanceTo(this._look);

    return this.focusDistance;
  }
}
