# GAS — Akash

A cinematic, scroll-piloted portfolio. Scroll is the only verb: no navigation, no
clicking to open anything. Frames cut, they do not merely flow.

**Read [SHOTLIST.md](SHOTLIST.md) first** — it is the film language and the production
bible. Every frame is built against it.

## Run

```bash
npm install && npm run dev
```

## Architecture

Each frame is a **shot** that owns its own scene, camera, lighting and colour grade.
That is the load-bearing decision: the previous build had one scene and one camera
lerping through it forever, which is why it read as a ride rather than a film.

```
src/
  core/
    ShotSystem.js     shot registry, scroll ranges, transition resolution
    GasTransition.js  THE signature mechanic — worlds atomize into gas and recondense
    Post.js           bloom · AgX tonemap · grade · aberration · vignette · grain
    Grade.js          per-shot lift/gamma/gain colour grade
    Assets.js         texture cache
    noise.js          shared GLSL (simplex + fbm)
  shots/
    TitleShot.js      ACT 0 — volumetric gas condensing into the wordmark
    DavinaShot.js     ACT II/01 — the look-dev reference frame
    ContactShot.js    ACT III
  ui/Overlay.js       thin DOM type layer, driven by shot state
  data/projects.js    the work, with per-project category + grade
```

### The gas transition

A world does not cut to the next world — it atomizes into gas, the gas churns, and the
gas recondenses into the next world. Implemented in screen space: both shots render to
half-float targets, a fullscreen pass advects each by curl-ish noise, breaks them up
with a per-pixel dissolve threshold, and emits light along the active dissolve edge so
it reads as igniting gas rather than a crossfade.

Cost is independent of scene complexity, and it works between **any** two shots — which
makes it a reusable transition operator rather than a one-off effect.

## Status

| | |
|---|---|
| Engine (shots, transitions, post stack) | done |
| ACT 0 — Title | done |
| ACT II / 01 — Davina Aerospace (look-dev reference) | done |
| ACT III — Contact | done |
| ACT I — Thesis | not started |
| ACT II / 02–06 — remaining five project worlds | not started |

The five remaining project worlds are specified in [SHOTLIST.md](SHOTLIST.md) §5 and are
produced against the Davina frame as the quality bar.

## Stack

Three.js · postprocessing (pmndrs) · GSAP · Lenis · Vite

Planet / sky textures: [Solar System Scope](https://www.solarsystemscope.com/textures/) (CC BY 4.0)

---

Built with [Claude Code](https://claude.com/claude-code).
