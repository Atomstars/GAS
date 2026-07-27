# GAS — Film Language & Shot List

The production bible. Every frame is built against this document.

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
| II | **THE WORK** | 6 × 160vh | Six bespoke project worlds. The payload. |
| III | **CONTACT** | 90vh | The gas disperses. Contact resolves out of it. |

Note the budget: **the work gets ~70% of the scroll.** The old build gave it 23% and spent
two-thirds of the journey flying through empty space. That inversion is fixed here by making
scroll duration an explicit per-shot design decision.

---

## 4. Rules that apply to every frame

1. **No clicking.** Scroll is the only verb. Links appear only at CONTACT and on project CTAs.
2. **Post-processing is not optional.** Bloom, grain, vignette, chromatic aberration, AgX
   tonemap and a **per-shot color grade** are part of the frame, not a filter on top.
   Every shot declares its own grade — that is how each project reads as its own sector.
3. **One key light.** Each world is lit by a single dominant source with everything else
   falling to black. Flat ambient lighting is what made the old build look like a toy.
4. **Long lenses.** FOV 28–35, not 60. Compression is what makes CG read as photographed.
5. **Nothing is a radial-gradient sprite.** Glows come from real geometry + bloom.
6. **Motion never fully stops.** Even at rest: drift, precession, particulate.

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
