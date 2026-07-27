import * as THREE from 'three';
import {
  EffectComposer, RenderPass, EffectPass,
  BloomEffect, ChromaticAberrationEffect, VignetteEffect,
  NoiseEffect, ToneMappingEffect, ToneMappingMode,
  BlendFunction, KernelSize,
} from 'postprocessing';
import { GradeEffect, NEUTRAL_GRADE } from './Grade.js';
import { VelocityEffect } from './Velocity.js';

/* Master intensity for the whole look. The first build set this effectively to
   "tasteful" and it read as flat — this is a spectacle brief, so it is loud. */
const BLOOM_GAIN = 1.75;

/* The frame is not the render — it is the render plus this stack.
   SHOTLIST.md §4.2: post-processing is part of the frame, not a filter on top. */

const lerp = (a, b, t) => a + (b - a) * t;

export class Post {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;

    this.composer = new EffectComposer(renderer, {
      frameBufferType: THREE.HalfFloatType,
      multisampling: Math.min(4, renderer.capabilities.maxSamples || 0),
    });

    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    this.bloom = new BloomEffect({
      intensity: 1.4,
      luminanceThreshold: 0.22,   // far more of the frame blooms
      luminanceSmoothing: 0.42,
      mipmapBlur: true,
      radius: 0.88,
      kernelSize: KernelSize.HUGE,
    });

    this.velocity = new VelocityEffect();

    const toneMode = ToneMappingMode.AGX ?? ToneMappingMode.ACES_FILMIC;
    this.tone = new ToneMappingEffect({ mode: toneMode });

    this.grade = new GradeEffect();

    this.chroma = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0.0018, 0.0018),   // ~4x the first pass; now visible
      radialModulation: true,
      modulationOffset: 0.22,
    });

    this.vignette = new VignetteEffect({ offset: 0.22, darkness: 0.78 });

    this.grain = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: true });
    this.grain.blendMode.opacity.value = 0.28;

    // velocity first, so bloom blooms the smear
    this.effectPass = new EffectPass(
      camera, this.velocity, this.bloom, this.tone, this.grade, this.chroma, this.vignette, this.grain,
    );
    this.composer.addPass(this.effectPass);

    // current (animated) grade state
    this._cur = structuredClone(NEUTRAL_GRADE);
    this._target = structuredClone(NEUTRAL_GRADE);
    this.fade = 1;
    this.turbulence = 0;
  }

  /** Swap what the composer renders. The effect pass camera is left alone —
      none of the effects in this stack are depth-driven. */
  setScene(scene, camera) {
    if (this.renderPass.mainScene !== scene) this.renderPass.mainScene = scene;
    if (this.renderPass.mainCamera !== camera) this.renderPass.mainCamera = camera;
  }

  /** Target grade — Post eases toward it so shot changes never pop. */
  setGrade(g) {
    this._target = { ...NEUTRAL_GRADE, ...g };
  }

  /** Snap immediately (used on first frame / hard cuts). */
  snapGrade(g) {
    this.setGrade(g);
    this._cur = structuredClone(this._target);
  }

  update(dt) {
    const k = 1 - Math.exp(-dt * 4.0);
    const c = this._cur, t = this._target;
    for (const key of ['lift', 'gamma', 'gain']) {
      for (let i = 0; i < 3; i++) c[key][i] = lerp(c[key][i], t[key][i], k);
    }
    c.sat = lerp(c.sat, t.sat, k);
    c.contrast = lerp(c.contrast, t.contrast, k);
    c.bloom = lerp(c.bloom, t.bloom, k);

    this.grade.lift.fromArray(c.lift);
    this.grade.gamma.fromArray(c.gamma);
    this.grade.gain.fromArray(c.gain);
    this.grade.sat = c.sat;
    this.grade.contrast = c.contrast;
    this.grade.fade = this.fade;

    // extra bloom + aberration while the gas is burning through a transition,
    // and again while the scroll is moving fast
    const heat = this.turbulence + this.velocity.amount * 0.7;
    this.bloom.intensity = c.bloom * BLOOM_GAIN + heat * 1.1;
    const o = 0.0018 + heat * 0.0055;
    this.chroma.offset.set(o, o);
    this.grain.blendMode.opacity.value = 0.28 + heat * 0.14;
  }

  /** @param {number} v 0..1 normalised scroll speed  @param {number} dirY -1..1 */
  setVelocity(v, dirY) {
    this.velocity.amount = v;
    this.velocity.dir.set(0, dirY);
  }

  /** 0 at rest, ->1 at peak churn of a gas transition. */
  setTurbulence(env) { this.turbulence = env; }

  render() { this.composer.render(); }

  setSize(w, h) { this.composer.setSize(w, h); }
}
