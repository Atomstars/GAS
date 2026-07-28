# GAS — handoff

Read `SHOTLIST.md` first; it is the production bible. This file is the state of
play and the things that will waste your time if you rediscover them the hard way.

---

## 1. Where the build is

**Ten shots, 1320vh.** The route is `TITLE → THESIS → GATE → six worlds → CONTACT`.

| # | Shot | File | State |
|---|---|---|---|
| 0 | TITLE | `src/shots/TitleShot.js` | Rebuilt. Wordmark condenses out of a gas volume. |
| I | THESIS | `src/shots/ThesisShot.js` | Rebuilt. Five beats, headline + supporting line. |
| I½ | **GATE** | `src/shots/GateShot.js` | **New.** Four category rooms on a helix. |
| 01 | Davina | `src/shots/DavinaShot.js` | Original look-dev frame. Still sets the bar. |
| 02 | Job-Agent | `src/shots/JobAgentShot.js` | **Weak — see §5.** |
| 03 | Café POS | `src/shots/CafePosShot.js` | **Weak — see §5.** |
| 04 | Housing | `src/shots/HousingShot.js` | **Weak — see §5.** |
| 05 | Buddy | `src/shots/BuddyShot.js` | Good. Real materials, lit device. |
| 06 | GMAT | `src/shots/GmatShot.js` | Corridor of type. Conclusion beat fixed. |
| III | CONTACT | `src/shots/ContactShot.js` | Rebuilt. The terminus: route + horizon. |

Shared modules: `src/core/Text.js` (type as geometry), `src/core/math.js` (ramps),
`src/core/motion.js` (reduced-motion policy).

---

## 2. How to see a frame

`requestAnimationFrame` does not fire when the browser pane is not displayed, so the
page reads as black. Use the dev harness — it drives the film deterministically:

```js
__GAS.resize(1600, 900)                // the pane reports innerWidth 0 when hidden
__GAS.settle()
await __GAS.shoot(0.42, 'my_frame')    // renders at global P, writes .frames/my_frame.png
await __GAS.sheet([[0.2,'a'], [0.5,'b']])
```

`__GAS.pump(n)` and `__GAS.fly()` drive the **real** loop from `main.js` — Lenis,
velocity smear and all — rather than a harness reimplementation. Use those to verify
scroll behaviour; `shoot`/`sheet` bypass Lenis.

**Do not benchmark heavily in the embedded pane.** Sustained GPU load wedges its GPU
process (`GL_VENDOR = Disabled`) and it then needs an app restart. Absolute timings
from it are unreliable — the same frame measured 1ms and 67ms in different contexts.
Ratios are meaningful; absolutes are not.

---

## 3. Decisions already made — don't relitigate

**Backgrounds change per world; the connective tissue does not.** The gas cut, grain,
letterbox, HUD, rail and cursor are constant. That is what makes it one film.

**The rail is the pipeline.** Right-hand rail, numbered stops, current one lit.

**Scroll is the only verb — with one deliberate exception.** The GATE adds click
targets. Scrolling past it flies the whole route exactly as before; clicking a room is
a shortcut. The default path is untouched.

**Featured worlds + listed rest.** `projects.js` carries `room` and `featured` on every
project. Flagships get a bespoke world; the long tail is listed inside its room. This
is what lets the set scale past ~8 projects without the route becoming endless.

---

## 4. Traps that already cost time

1. **`THREE.MathUtils.smoothstep(x, min, max)` returns 0 when `min > max`.** Use
   `ramp()` / `lramp()` from `core/math.js`, which handle both directions.

2. **`MeshStandardMaterial` with high `metalness` and no env map renders black.**

3. **Point-sprite size goes as 1/z** — clamp `gl_PointSize` *and* fade on approach.

4. **The gas cut's burn edge is what blows out, not bloom.** It is `pow(..., 6.0)`.
   Re-measure midpoints if you touch `uEdgeStrength`: target meanLum 0.05–0.08, and the
   outgoing shape must still be visible at `mix = 0.5`.

5. **A beat must be GONE before the lens reaches it.** A block is frame-filling by ~7
   units out; past that it is giant cropped letters, and because type is additive you
   read the corridor and the *next* beat straight through it.

6. **Beat spacing must be narrower than the readable window.** That window is bounded at
   both ends (too small far out, cropped up close) — about 48 units. Spacing beats 68
   apart left holes where neither was legible (measured 0.08 / 0.13 opacity).

7. **The camera must stop SHORT of the final beat.** Overshooting put THESIS's closing
   line at opacity 0.04 and the GATE's fourth room at 0.00 — both acts ended on an empty
   frame. Stop ~45 units short and hold.

8. **Backticks inside GLSL comments terminate the JS template literal.** The file dies
   with a `SyntaxError` pointing nowhere near the cause.

9. **`paragraphTexture` and `textTexture` both take a `halo` option.** It used to be
   hardcoded in `paragraphTexture`, so every multi-line block silently ignored
   `TIGHT_HALO`. Small type needs the tight halo or its counters fill in.

10. **Shader compilation, not frame cost, was the stall.** Building a shot creates
    materials; WebGL does not compile until first *render*. Measured 120–530ms per world,
    landing mid-scroll. `main.js` now warms each shot with `compileAsync` plus one
    off-screen render into a half-float target. Do not remove it.

11. **The pane reports `innerWidth: 0` when hidden**, which sized the drawing buffer to
    1×1 and made every measurement read black. `resize()` has an unconditional floor.

12. **Chromatic aberration tears thin bright lines.** Base is 0.0009; at the old 0.0018
    every 1px line in the film (ducts, rails, portals) split into red/green ghosts.

---

## 5. What is not done

- **Job-Agent, Café POS and Housing do not hold up** next to Davina and Buddy. Decide
  whether to rebuild them or demote them to listed entries (`featured: false`) in their
  rooms.
- **GMAT should read as a knowledge app** — real questions, not just a type corridor.
- **No per-project detail content.** Each project has a blurb and stack chips; nothing
  about the problem, the approach or the outcome, and no live links.
- **The fly-through may be the wrong motion model for readable type.** Type scales and
  slides the entire time it is on screen. Letting each beat come to rest and hold is the
  obvious alternative and has not been tried.
- **Frame rate has never been measured reliably on real hardware** (see §2). Scroll
  behaviour is verified via `__GAS.pump`/`fly`, not by a human.
- **No mobile device testing.** The CSS and pixel-ratio caps are in, untested on glass.

---

## 6. On the Motion MCP

`create_video` is a **video generator** — it produces finished video files from a brief.
It cannot produce scroll-driven WebGL, shaders or website animation code, so it plays no
part in building this site. It would be the right tool for a promo reel *of* the finished
site. The account currently has 0 credits.

---

*Built with Claude Code.*
