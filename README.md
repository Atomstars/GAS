# GAS

A real-time cinematic portfolio for **Akash** (*Akash* — Sanskrit for "the sky").

Not a page with animations on it. One continuous camera take, shot through a
single virtual lens, scrubbed by the scroll wheel. Nothing is clicked.

## Run it

```bash
npm install
npm run dev
```

Then open the printed URL. `npm run build` produces a static bundle in `dist/`.

## How it is built

The whole film is a pure function of one number — journey progress `P ∈ [0,1]`.
Scrub `P` to any value and the frame is identical every time, forwards or
backwards. That constraint is what keeps a scroll-driven film from drifting out
of sync with itself.

```
src/
  core/
    lens.js      the lens — every frame is shot through this
    rig.js       the camera operator
    director.js  owns P, and the beats each frame claims
  frames/
    f01-title.js FRAME 01 — GAS
  shaders/
    noise.js     simplex + flow field, shared by all frames
  data/
    projects.js  the work, one entry per frame
  main.js        wiring only
```

### The lens (`core/lens.js`)

An `EffectComposer` chain that behaves like real glass rather than like a filter
stack: depth-of-field with rack focus, bloom thresholded high so only highlights
bloom (a low threshold is what makes real-time work look cheap), anamorphic
horizontal streaks, chromatic aberration that grows toward the edges, barrel
distortion, a film response curve with split-toning, vignette, animated grain,
and an animated letterbox.

Tone mapping is deferred to the end of the chain so bloom happens in linear HDR,
where it belongs.

### The rig (`core/rig.js`)

Keyframes are interpolated along a Catmull-Rom spline, so velocity is continuous
*through* every waypoint — the camera does not stop at keyframes unless a beat
explicitly asks it to `hold`. On top of the path it banks, breathes on layered
irrational-frequency sines, racks focus, changes focal length, and can take a
decaying impulse shake.

### The director (`core/director.js`)

Scroll is throttle, not position. Wheel, both trackpad axes, touch and arrow keys
all feed one damped target. It publishes velocity as well as position, so frames
can react to how hard the viewer is travelling — speed opens the aperture,
strengthens bloom and stretches the aberration.

### Frame 01 — GAS

Around 200k points on the GPU, permanently displaced by a two-octave flow field
evaluated in the vertex shader. The word GAS is a *target state* those same
points are pulled toward; the letterforms are sampled from live text and extruded
in Z, so the word has real thickness and parallax when the camera pushes through
it. Points are large and soft as gas, small and tight as letters.

Brightness and point size are normalised against particle density, so changing
the budget changes fidelity and not exposure — additive blending otherwise turns
a performance setting into a grade setting.

## Status

Frame 01 is shot. The lens, rig and director are built to carry the rest:
the craft frame, and one frame per project, each with its own world.

## Controls

Scroll, trackpad, touch, or arrow keys. `Home` / `End` jump the route.
There is nothing to click.

---

Built with [Claude Code](https://claude.com/claude-code).
