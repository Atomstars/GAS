import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export class Assets {
  constructor(renderer) {
    this.renderer = renderer;
    this.loader = new THREE.TextureLoader();
    this.cache = new Map();
    this.maxAniso = renderer.capabilities.getMaxAnisotropy();
    this._env = null;
  }

  /* A prefiltered environment, built once and shared by every shot that asks.

     Direct lights alone cannot produce a high-key set. What makes a white room read as
     a room rather than as flat paint is the light bouncing off every surface into every
     other one, and with no env map a MeshStandardMaterial has nothing to reflect —
     which is the same reason HANDOFF trap 2 exists (metalness with no env renders
     black). RoomEnvironment is a rendered box of soft area lights; one PMREM pass turns
     it into the bounce. */
  environment() {
    if (this._env) return this._env;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this._env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return this._env;
  }

  texture(path, { srgb = true } = {}) {
    if (this.cache.has(path)) return this.cache.get(path);
    const t = this.loader.load(path);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = this.maxAniso;
    this.cache.set(path, t);
    return t;
  }
}
