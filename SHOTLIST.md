# GAS — Film Language & Shot List

The production bible. Every frame is built against this document.

> **Amended by `GAS-REBUILD-BRIEF.md`.** §4 below now carries R1–R7 and replaces the old
> rules 1 and 3. §1 (gas as the medium), §2 (the match-cut rule) and §6 (Davina look-dev)
> stand unchanged. Where this document and the brief disagree on anything else, the brief
> wins. §3's act structure is superseded by the brief's route: the six worlds are cut to
> three flagships and THE WALL becomes the centrepiece.

---

## 1. The core idea

**GAS is not a decoration. It is the medium the whole film is made of.**

Akash — Sanskrit for *sky / ether / the space between things*. GAS is both the brand and a
state of matter. So: gas is not something floating in the frame, it is what every frame is
**made of** and what every frame **dissolves back into**.

This gives us the signature mechanic:

> **A world does not cut to the next world. It atomizes into gas, the gas churns, and the
> gas recondenses into the next world.**

That transition *is* the brand. It fires on every act change, and it is the reason the name
is on the screen without ever writing it twice.

---

## 2. Transition grammar

Locked: **continuous flight inside an act, gas match-cut between acts.**

| Level | Mechanic | Feel |
|---|---|---|
| Within an act | Unbroken camera move, long lens, slight handheld noise | Flow, immersion |
| Between acts | Gas dissolve + hard match cut on shape or motion | Edit rhythm, punctuation |

**The gas dissolve is screen-space**, not particles: the outgoing frame is advected by
curl noise, broken up by a per-pixel dissolve threshold, and the active dissolve edge emits
light into bloom — so it reads as *igniting gas*, not a crossfade. Cost is independent of
scene complexity, and it works between any two shots.

**Match-cut rule:** the last shape of shot N and the first shape of shot N+1 must rhyme.
A planet limb becomes a radar arc. A star flare becomes a headline stroke. The gas carries
the shape across. Never cut on nothing.

---

## 3. Act structure

| Act | Shot | Scroll budget | Purpose |
|---|---|---|---|
| 0 | **TITLE** | 90vh | GAS condenses out of volumetric gas. Establish tone. |
| I | **THESIS** | 120vh | What I build. Kinetic type in 3D — camera flies through the statement. |
| II | **THE WORK** | 890vh over six worlds | Six bespoke project worlds. The payload. |
| III | **CONTACT** | 90vh | The gas disperses. Contact resolves out of it. |

Per-world budgets are not uniform — they are set by how much material each world actually
has to show: Davina 160, Job-Agent 150, GMAT 150, Café POS 145, Housing 145, Buddy 140.
Total journey **1190vh**.

Note the budget: **the work gets 74.8% of the scroll** (assert it with
`__GAS.shots.shots.filter(s => s.data).reduce((a, s) => a + s.scrollVh, 0) / __GAS.shots.totalVh`).
The old build gave it 23% and spent two-thirds of the journey flying through empty space.
That inversion is fixed here by making scroll duration an explicit per-shot design decision.

---

## 4. Rules that apply to every frame

### R1 — Scroll is how you travel. Choice is how you arrive.
*(replaces the old "no clicking")*

The film moves on scroll alone. But the work is a destination, not scenery — at THE WALL
and inside every project world, the visitor may act. Every interactive target must also be
reachable by **scrolling past it** (nothing is ever blocked) and by **keyboard** (nothing is
mouse-only). The old rule was written to stop the site becoming a menu; it ended up stopping
the site having a door. A gate you fly through is a corridor with signposts.

### R2 — Arrive and dwell.
**Every shot is TRAVEL → ARRIVE → DWELL → DEPART, not a linear pan.**

Camera position is an eased, *segmented* function of local scroll, never a lerp. In the DWELL
segment the camera is parked — ambient drift only, **≤0.4 units of translation** — and type is
stationary, at full opacity, at final size, and interactive. A beat that never comes to rest
was never a frame.

Budget per beat: `travel 0.28 · dwell 0.44 · depart 0.28`. Dwell never below **0.35**.

Implemented once, in `core/beat.js`, so every shot inherits it:

| Export | Does |
|---|---|
| `beatCurve(localP, count)` | the segmented curve. Returns `u` (flat at an integer while parked), `phase`, and `dwell` |
| `stationAt(stations, u)` | `u` → a position, extrapolating the entry and exit stations |
| `beatPresence(u, i)` | a beat's opacity and reveal wipe, tied to `u` rather than to distance |
| `dwellDrift(t, amp)` | ambient drift for a parked camera, capped at 0.4 |

A shot writes `this.dwell` every frame from `beatCurve`. `ShotSystem` surfaces it, `Post`
kills the aberration on it and the letterbox retracts on it — see R4. During a gas cut the
dwell is forced to 0; nothing is parked while the frame is being atomized.

**Presence is a function of `u`, not of distance to the lens.** That is what makes trap 5
structural instead of hand-tuned per shot: a beat is guaranteed dark before the camera
reaches its plane, whatever the geometry it sits in. The reveal wipe must finish before the
dwell begins, or a frame grabbed at rest catches the film mid-wipe.

### R3 — Transition vocabulary.
*(replaces "gas cut on every act change")*

**The gas cut is the brand punctuation, not the only punctuation.** Five moves, used
deliberately. Four live in `core/transitions/` as pure functions of a 0..1 parameter; the
gas cut stays in `core/GasTransition.js` because it is the only one that operates on the
whole frame rather than inside a shot.

| Move | Where | Feel |
|---|---|---|
| **Gas atomize** | Act boundaries ONLY: TITLE→THESIS, WALL→WORLD, WORLD→WALL, →CONTACT | The signature. Rare = strong |
| **Aperture** | Entering a project from the wall: the title's frame dilates and you fall through it | Choice honoured |
| **Whip-pan match cut** | Between beats *inside* a world | Edit rhythm |
| **Rack focus** | Foreground type ↔ background world | Attention transfer |
| **Light-lead** | A moving key light precedes the camera and drags the next set in | Continuity |

**Match-cut rule (§2) still applies:** the last shape of N and the first shape of N+1 must
rhyme. Never cut on nothing.

### R4 — Value keys.
*(replaces "everything falls to black")*

**Each world declares a KEY, not just a hue.** At least two featured worlds must be
*high-key* — bright, near-white, overexposed, shadows lifted. A film that is dark for 100%
of its runtime has no dark.

Floor on every grade: `lift ≥ 0.035`. Vignette ≤ 0.35. Grain ≤ 0.045. Chromatic aberration
0.0006 base and **0 during dwell** — it is a motion effect, and held on a stationary frame
it is just damage to the one thing the dwell exists for (trap 12). Letterbox bars animate to
0 during dwell and return during travel. **The film ends on light, not black.**

### R5 — Evidence over adjectives.

No sentence ships that a sceptical senior engineer could not verify or interrogate. Every
project carries problem, constraint, build, AI and outcome. Headlines ≤ 6 words, bodies
45–70 words. `stack` is technologies only; roles and disciplines live in a separate field.
**Never invent a metric** — emit `[FILL]` and list it in `VERIFY.md`. A fabricated number is
the only unrecoverable error on this site.

### R6 — The film is the site, so the film is accessible.

`aria-hidden` is banned on content layers. Solve the live-region churn with `aria-live="off"`
plus one `aria-live="polite"` announcer that fires **once per shot entry**, not per frame.
`#index` stays as the crawlable spine but is no longer the only accessible surface. Every
interactive target is a real `<button>`/`<a>`, tab-reachable, with visible `:focus-visible`.

### R7 — Performance is a design constraint.

Ship an in-page FPS profiler that buckets frame rate by scroll depth and labels the shot,
*before* optimising anything. Target locked 60 on a mid-range Android. Never re-render on
scroll — progress lives in a ref read inside the loop. Audit MSAA anywhere a composer is
involved. Optimise by removal.

### Unchanged from the first bible

8. **Post-processing is not optional.** Bloom, grain, vignette, chromatic aberration, AgX
   tonemap and a **per-shot colour grade** are part of the frame, not a filter on top.
9. **One key light.** Each world is lit by a single dominant source. Flat ambient lighting is
   what made the old build look like a toy. (R3's light-lead moves that key; it does not add
   a second one.)
10. **Long lenses.** FOV 28–35, not 60. Compression is what makes CG read as photographed.
11. **Nothing is a radial-gradient sprite.** Glows come from real geometry + bloom.
12. **Motion never fully stops.** Even at rest: drift, precession, particulate. R2 parks the
    camera; it does not kill the frame.

---

## 5. Project worlds — categorization by domain

Each project gets a world that *is* its domain. This is the categorization the site is for.

| # | Project | Category | World | Key colour |
|---|---|---|---|---|
| 01 | **Davina Aerospace** | Aerospace / Product | Orbital vantage. Planet limb backlit at the terminator, wireframe orbital lattice, tracking reticles locking onto the surface, high-atmosphere ice particulate. | Cold cyan-white / warm sun rim |
| 02 | **Job-Agent** | AI Agent / Autonomy | A dark graph that thinks. Nodes fire, paths resolve, an agent traverses the network live while you watch. | Amber |
| 03 | **Café POS × n8n** | Automation / Systems | A working machine. Near-orthographic flow field, product moving through pipes and nodes, mechanical rhythm. | Copper / cream |
| 04 | **Housing Predictor** | ML / Prediction | A data terrain. Camera flies low over a 3D price surface; the prediction ridge forms in the air ahead of the actual. | Teal-green |
| 05 | **Buddy App** | Product / Human | Intimate scale. Close, warm, soft-focus interior. Device surfaces, human proportion — deliberate relief after the machines. | Violet |
| 06 | **GMAT Verbal Engine** | EdTech / Language | Text as architecture. Passages form structures the camera moves through; an argument resolves into its conclusion as you pass. | Cyan |

**Look-dev frame: 01 Davina Aerospace.** Built first, to full quality, including its in and
out transitions. It sets the bar. The other five are produced against it.

---

## 6. Davina — look-dev spec

- **Vantage:** high orbit, camera near the limb so the planet edge cuts the lower third.
- **Key light:** sun at grazing angle behind the limb → hard terminator, bright scattering
  arc along the atmosphere, everything on the near side falling to black.
- **Atmosphere:** rim shader driven by sun direction, not a uniform glow — bright where lit,
  dead where not. This is the single most important element in the frame.
- **Structure:** wireframe orbital lattice, thin emissive lines, slight precession.
- **UI in-world:** tracking reticles projected in 3D that lock onto surface points and drift.
  Telemetry is *in the scene*, not a DOM panel floating above it.
- **Particulate:** fine ice crystals catching the key light.
- **Lens:** FOV 30, slow orbital drift, subtle handheld noise.
- **Grade:** crushed blue-black shadows, cyan-white highs, warm rim protected. High contrast.

---

*Built with Claude Code.*
