# GAS — A Journey Through My Galaxy

A cinematic, scroll-piloted WebGL portfolio for **Akash** (*Akash* — Sanskrit for "the sky").

You begin as a single molecule of gas. Scroll to travel: through swirling gas, up
through the atmosphere, past **Earth**, past the **Sun**, out into the galaxy — where
six burning **stars** are the projects I've built.

## Run locally

No build step required — it's plain HTML + CSS + ES modules.

```bash
npx vite            # or any static server, e.g. `python -m http.server`
```

Then open the printed local URL.

## Stack

- **Three.js** (r160, via CDN) — real-time 3D: molecules, nebula gas, textured
  planets, the Sun, a 16k-particle spiral galaxy, project stars
- **GSAP** — title reveal and UI transitions
- Pure canvas 2D for the "GAS" gas-condensation title
- Planet / Sun / Milky-Way textures: [Solar System Scope](https://www.solarsystemscope.com/textures/) (CC BY 4.0)

## Brand

Six logo routes live in [`brand/`](brand/) — one geometric alphabet, drawn as
paths rather than type. See [`brand/README.md`](brand/README.md) for the
construction and where each mark works.

## Controls

There are no buttons. **Scroll / trackpad / arrow keys** are the ship's throttle —
scroll forward to fly the route, scroll back to reverse it. Each project star opens a
transmission panel linking to its GitHub repo.

---

Built with [Claude Code](https://claude.com/claude-code).
