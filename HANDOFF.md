# GAS — handoff

Read `SHOTLIST.md` first; it is the production bible and every shot is built against it.
This file is the state of play and the things that will waste your time if you rediscover
them the hard way.

---

## 1. Where the build is

The film is **nine shots, 1190vh, complete end to end.** Before this pass it was three
shots with five of the six project worlds missing — that absence, not the look, was why the
site felt unfinished.

| # | Shot | File | State |
|---|---|---|---|
| 0 | TITLE | `src/shots/TitleShot.js` | Pre-existing. Volumetric gas wordmark, pointer wake + parallax. Untouched. |
| I | THESIS | `src/shots/ThesisShot.js` | **New.** Corridor fly-through, statement ignites in reading order. |
| 01 | Davina | `src/shots/DavinaShot.js` | Pre-existing look-dev frame. Untouched — it still sets the bar. |
| 02 | Job-Agent | `src/shots/JobAgentShot.js` | **New.** Graph mid-search, burning traversal, stage labels. |
| 03 | Café POS | `src/shots/CafePosShot.js` | **New.** Near-ortho workflow machine, packets on a fixed cadence. |
| 04 | Housing | `src/shots/HousingShot.js` | **New.** Terrain flyover, prediction ribbon leading the ground. |
| 05 | Buddy | `src/shots/BuddyShot.js` | **New.** The relief shot — real materials, real key light, lit device. |
| 06 | GMAT | `src/shots/GmatShot.js` | **New.** Text-as-architecture corridor, argument resolves as a lighting change. |
| III | CONTACT | `src/shots/ContactShot.js` | Pre-existing. **Weakest shot in the film — see §5.** |

New shared modules: `src/core/Text.js` (type as scene geometry), `src/core/math.js` (ramps).

---

## 2. How to actually see a frame — do this before changing any look

**`requestAnimationFrame` does not fire when the browser pane is not displayed**, so the
render loop never runs and the page reads as blank/black. This will make you think you have
broken something when you have not.

There is a dev harness for exactly this. `src/dev/harness.js` is imported by `main.js` behind
`import.meta.env.DEV` and drives the film deterministically, independent of rAF:

```js
// in the page console / javascript_tool
await __GAS.shoot(0.42, 'my_frame')        // render at global progress P, write .frames/my_frame.png
await __GAS.sheet([[0.2, 'a'], [0.5, 'b']]) // contact sheet
```

It returns `{ shot, to, mix, lit, hot, meanLum }` — `lit` is the fraction of the frame above
black. **Use the numbers, not your impression of a description.** Every look bug in §4 was
found by a measurement disagreeing with what the code was supposed to be doing.

Frames land in `.frames/` (gitignored), served by the `frameSink` plugin in `vite.config.js`.
Keep a sheet under ~6 frames per call or the tool call times out.

Start the server with the Browser pane tools (`preview_start` with name `site`), never Bash.

---

## 3. Design decisions already made — don't relitigate these

**Background: changes per world, with constant connective tissue.** Each project has its own
background, palette and grade, because the whole premise is that each project reads as its own
domain. What stays constant across all nine shots is the gas transition, the grain, the
letterbox, the HUD, the rail and the cursor. That is what makes it one film rather than nine
screensavers. The alternative — one fixed background — was considered and rejected: it would
flatten the six worlds into one.

**The rail is the pipeline.** Right-hand rail, six numbered stops, the current one lit.
This is the "pipeline from one end to the other with each project in between" made literal.
`Overlay.buildRail()` + `#rail-ticks i.stop` in `style.css`.

**Scroll is still the only verb.** No added click targets outside CONTACT and project CTAs.

---

## 4. Traps that already cost time

1. **`THREE.MathUtils.smoothstep(x, min, max)` returns 0 when `min > max`.** It guards with
   `if (x <= min) return 0`, so a descending range — which is how you write almost every
   fade-out — silently evaluates to zero everywhere. Every fade in THESIS was dead because of
   this. Use `ramp()` / `lramp()` from `src/core/math.js`, which handle both directions.

2. **`MeshStandardMaterial` with high `metalness` and no environment map renders black.**
   A metal has nothing to reflect. The Buddy device body vanished entirely at `metalness: 0.72`.
   It is `0.22` now with tight roughness.

3. **Point-sprite size goes as 1/z, so a node drifting through the lens fills the frame.**
   One Job-Agent node measured 38% frame coverage on its own. Both a `min()` clamp on
   `gl_PointSize` and a near-fade on brightness are needed — the clamp alone still leaves a
   flat disc parked in shot.

4. **The gas transition's burn edge is the thing that blows out, not bloom.** Isolating it
   measured 0.383 mean luminance for the edge term against 0.015 for both worlds combined.
   The tent `1 - |a*2 - 1|` sits above 0.7 across ~20% of a smooth threshold field, so a soft
   exponent ignites a fifth of the *frame* at once. It is `pow(..., 6.0)` now. If you touch
   `uEdgeStrength`, re-measure the midpoints — target **meanLum 0.05–0.08**, and the outgoing
   shape must still be visible at `mix = 0.5`.

5. **Fly-through type crops to nonsense if you set it as long single lines.** A 20-character
   line is ~11:1; at any distance where it fills the frame vertically it is several frame-widths
   wide. Measured ndcX 1.54 at the exact moment its reveal completed. Set as two-line blocks.

6. Shots whose subject is large areas of near-white type need their grade `bloom` at ~0.5,
   not the stack default. THESIS and GMAT both override it.

---

## 5. What is not done

- **CONTACT is the weakest shot.** It is still the original churning gas bed with DOM type on
  top and no structure of its own. It is the last thing a prospective client sees and it does
  not currently earn that position. Highest-value next job.
- **`index.html` copy was never reviewed.** The title lede, contact copy and CTAs are whatever
  the earlier session wrote. Worth a read against the marketing intent.
- **No performance pass.** Nine shots build lazily, but nothing has been profiled. The GMAT
  and Job-Agent scenes are the heaviest.
- **No mobile pass**, and `prefers-reduced-motion` only covers the two original CSS animations —
  none of the new scroll-driven camera work respects it.
- **Live scroll was never verified end-to-end.** Everything was verified through the harness,
  which bypasses Lenis and the velocity smear. The Lenis feel, the scroll-velocity smear and
  the transitions under real fast scrolling are unproven. **Verify this first** — with the
  browser pane displayed, rAF runs and normal screenshots work.

---

## 6. On the Motion MCP

The connected Motion MCP (`create_video`) is a **video generator** — it produces finished
video files from a brief. It cannot produce website animation code, shaders or scroll-driven
motion, so it played no part in this build and is not the tool for the remaining work. It
would be the right tool for a promo reel *of* the finished site.

---

*Built with Claude Code.*
