import * as THREE from 'three';

export class Assets {
  constructor(renderer) {
    this.loader = new THREE.TextureLoader();
    this.cache = new Map();
    this.maxAniso = renderer.capabilities.getMaxAnisotropy();
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
