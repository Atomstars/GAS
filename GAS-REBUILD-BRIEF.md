# GAS v2 — Rebuild Brief & Agent Rules

**Status of v1:** engine is good, film is not. Do not rewrite the engine.
**Precedence:** on conflict this document supersedes `SHOTLIST.md` and `HANDOFF.md`.
**Read order:** §1 diagnosis → §2 the six rules that change → §3 architecture → §4 content → §5 the master prompt

---

## 1. Diagnosis — what is actually wrong

### What is genuinely good — keep it

- `ShotSystem` — per-shot scene/camera/grade. Correct architecture.
- `GasTransition` — screen-space advect + dissolve + edge emission. A signature mechanic.
- `main.js` warm-up loop — `compileAsync` + off-screen half-float pre-render. This is the exact
  fix award-grade sites use. Do not touch it.
- `Post.js` velocity smear, `motion.js` reduced-motion policy, `math.js` `ramp/lramp`,
  `Text.js` halo handling.
- The trap list in `HANDOFF.md` §4. That is institutional knowledge — carry it forward verbatim.

### The actual root causes

**A. The motion model is a ride, not a film.**
`HANDOFF.md` §5 already says it: *"The fly-through may be the wrong motion model for readable
type. Type scales and slides the entire time it is on screen. Letting each beat come to rest and
hold is the obvious alternative and has not been tried."* `camZ = (p) => CAM_Z0 + (CAM_Z1 -
CAM_Z0) * p` — the camera is a linear function of scroll with no rest state. Nothing ever
arrives. There is no frame, only a pan. Highest-leverage change in the rebuild.

**B. The GATE exists but it does not gate.** `GateShot` was built as a shot you fly *through*,
because `SHOTLIST.md` §4 rule 1 said "No clicking. Scroll is the only verb." It is a corridor
with signposts, not a wall. The rule must be amended, not worked around.

**C. "Too dark" is a compounding stack, not a colour choice.** Six things multiply: black body
+ black clear colour; "one key light, everything else falling to black"; every grade crushing
(`lift: [-0.012, -0.006, 0.014]`, `contrast: 1.16`); `Grade.js` applying contrast around mid-grey
*after* gamma; vignette + grain + aberration all subtractive at the edges; permanent letterbox
bars at `4.2vh`. Any one is fine. All six is mud. And because every world uses the same
cyan-family accent with gain deltas of ±0.1, the per-shot grade does not actually differentiate
anything — they read as one dark blue film.

**D. The content is copy, not evidence.** Every blurb is one sentence of swagger. No problem, no
constraint, no decision, no outcome, no stack rationale, no AI angle. The `stack` arrays are
padded with non-technologies (`'Systems Design'`, `'Product Design'`, `'UX'`) — a hiring engineer
reads that as filler.

**E. The one link is a repo link.** No live demo, no case study, no screenshots. A repo link asks
the visitor to do the work of evaluating you.

**F. Accessibility is 30% of the Awwwards score and the site has opted out.** `#caption`,
`#contact-copy` and `#title-copy` are all `aria-hidden="true"`; the entire visible site is
invisible to assistive tech and `#index.sr-only` is a parallel text-only site. Fix the
live-region problem instead of hiding the layer.

**G. Scope is the quiet killer.** Six bespoke worlds, three already marked "do not hold up."
Six mediocre worlds lose to three excellent ones.

**H. The strongest project is not on the site.** The agentic defect-resolution pipeline —
MCP-wired Copilot agents against Jira/GitLab/Wiki/Postgres/Kibana in a zero-egress banking
environment, MRs merged to production. Sanitise the client and ship it as the flagship.

---

## 2. The six rules that change

These amend `SHOTLIST.md`. Everything else in the bible stands.

### RULE 1 (replaces "no clicking")
> **Scroll is how you travel. Choice is how you arrive.**
> The film moves on scroll alone. But the work is a destination, not scenery — at THE WALL and
> inside every project world, the visitor may act. Every interactive target must also be
> reachable by scrolling past it (nothing is blocked) and by keyboard (nothing is mouse-only).

### RULE 2 — arrive and dwell (most important)
> **Every shot is TRAVEL → ARRIVE → DWELL → DEPART, not a linear pan.**
> Camera position is an eased, *segmented* function of local scroll, not a lerp. In the DWELL
> segment the camera is parked — only ambient drift, ≤0.4 units of translation — and type is
> stationary, at full opacity, at final size, and interactive. A beat that never comes to rest
> was never a frame.
>
> Budget shape per shot: `travel 0.28 · dwell 0.44 · depart 0.28`. Dwell is never below 0.35.

### RULE 3 — transition vocabulary (replaces "gas cut on every act change")
> **The gas cut is the brand punctuation, not the only punctuation.** Five moves:
>
> | Move | Where | Feel |
> |---|---|---|
> | **Gas atomize** | Act boundaries only: TITLE→THESIS, WALL→WORLD, WORLD→WALL, →CONTACT | The signature. Rare = strong |
> | **Aperture** | Entering a project from the wall: the title's frame dilates and you fall through it | Choice honoured |
> | **Whip-pan match cut** | Between beats *inside* a world | Edit rhythm |
> | **Rack focus** | Foreground type ↔ background world, via DOF | Attention transfer |
> | **Light-lead** | A moving key light precedes the camera and drags the next set in | Continuity |
>
> Match-cut rule from the old bible still applies: last shape of N and first shape of N+1 must rhyme.

### RULE 4 — value keys (replaces "everything falls to black")
> **Each world declares a KEY, not just a hue.** At least two featured worlds must be *high-key*
> — bright, near-white, overexposed, shadows lifted. A film that is dark for 100% of its runtime
> has no dark.
>
> Floor: `lift ≥ 0.035` on every grade. Vignette ≤ 0.35. Grain ≤ 0.045. Chromatic aberration
> 0.0006 base and **0 during dwell** (it tears the thin type you want read — `HANDOFF` trap 12).
> Letterbox bars animate to `0` during dwell and return during travel.

### RULE 5 — evidence over adjectives
> **No sentence ships that a sceptical senior engineer could not verify or interrogate.** Every
> project carries problem, constraint, decision, outcome, and a named AI use case. Numbers are
> real or absent — never invented, never rounded up. `stack` contains technologies only; roles
> and disciplines live in a separate field.

### RULE 6 — the film is the site, so the film is accessible
> `aria-hidden` is banned on content layers. Solve the live-region churn with `aria-live="off"`
> plus a single `aria-live="polite"` announcer that fires **once per shot entry**, not per frame.
> `#index` stays as the crawlable spine but is no longer the only accessible surface. Every
> interactive target is a real `<button>`/`<a>`, tab-reachable, with visible `:focus-visible`.

### RULE 7 — performance is a design constraint
> Ship an in-page FPS profiler that buckets frame rate by scroll depth and labels the shot,
> *before* optimising anything. Target locked 60 on a mid-range Android. Never re-render on
> scroll — progress lives in a ref read inside the loop. Audit antialias/MSAA anywhere a
> composer is involved.

---

## 3. New architecture

### 3.1 Route

```
ACT 0    TITLE          90vh    gas condenses into the wordmark        (keep)
ACT I    THESIS        150vh    5 beats, ARRIVE + DWELL on each        (remodel)
ACT I·5  ABOUT          90vh    NEW — who, where, what I actually do
────────────────────── gas atomize ──────────────────────
ACT II   THE WALL      260vh    NEW — the monolith. Titles. The choice.
ACT III  WORLDS      3×300vh    THREE flagship worlds, not six          (cut 3)
ACT IV   THE LEDGER   140vh     NEW — remaining work, listed, dense, fast
ACT V    CONTACT      100vh     the terminus                            (keep)
                     ────────
                      1730vh
```

Cutting six worlds to three is the highest-value decision in this document. `JobAgentShot`,
`CafePosShot`, `HousingShot` are marked weak by `HANDOFF.md` §5 — demote them to THE LEDGER
(`featured: false`, one strong line + real link each) and spend the reclaimed effort on three
worlds that are genuinely finished.

**The three flagships:**
1. **DEFECT PIPELINE** (new) — agentic MCP pipeline, zero-egress. Strongest and most current.
2. **GMAT VERBAL ENGINE** — real RAG: FastAPI, Qdrant, MiniLM embeddings, cosine retrieval,
   multimodal parsing, 63-test regression harness.
3. **DAVINA AEROSPACE** — already at look-dev quality; the bar frame.

### 3.2 THE WALL — the centrepiece

**The object.** The camera arrives at a vast dark monolith spanning far beyond the frame on both
sides. It is not a menu. It is architecture — etched, weathered, lit by a single raking light
from screen left so the surface has grain and depth.

**The arrival.** Forward motion **stops**. Camera z is locked. This is the wall in every sense —
you cannot fly through it.

**The traverse.** Scroll now maps to **lateral dolly along the wall**, not forward flight. This
inversion is the whole idea: the visitor's scroll gesture is unchanged, but the meaning of it
changes, and that reads as arriving somewhere.

**The titles.** Each featured project's name is cut into the wall as large display type — deep
carved geometry, not a texture, catching the raking light on one edge. Titles are spaced so
exactly one occupies the centre of the frame at a time, with the previous and next legible at
the margins.

**The ignition.** As a title reaches centre and the camera dwells:
1. The carved letterforms fill with light from the bottom up
2. The rectangle bounded by the title **becomes a window** — the project's actual 3D world
   renders behind it, in motion, seen through the letters
3. A small in-world plate resolves beside it: category · year · one-line claim · `[LIVE] [REPO] [CASE]`
4. The wall's raking light warms toward that project's accent

**The choice.** Three ways out, all valid:
- **Keep scrolling** → the window dims, the next title ignites. Nothing was required.
- **Press ENTER / click the title** → **aperture transition**: the window dilates past the frame
  edge and you are inside that world.
- **Click LIVE / REPO / CASE** → opens externally, film untouched.

**The return.** Exiting a world gas-cuts back to the wall at the position you left, with that
title now marked as visited (a thin filled bar beneath it). The wall is the hub; the worlds are
spokes.

**Implementation notes**
- One shared window material; the "world behind the letters" is that shot's scene rendered to a
  render target and sampled through a text-shaped alpha mask. Shots are already rendered into
  `gas.rtFrom` during warm-up — reuse that path.
- Only the *centred* title's world renders live. Neighbours use a still captured at warm-up. One
  extra scene render per frame maximum.
- Lateral dolly must be rate-limited the same way `MIN_GAS_SECONDS` limits the gas mix, or a
  wheel flick skips three titles in two frames.

### 3.3 Inside a project world — the case-study spine

Every world is the same five beats. The 3D changes; the structure never does.

```
BEAT 1  THE PROBLEM     travel in · dwell   what was broken, and for whom
BEAT 2  THE CONSTRAINT  whip-pan · dwell    what made it hard. the honest limit
BEAT 3  THE BUILD       rack focus · dwell  architecture. the decision you defend
BEAT 4  THE AI          light-lead · dwell  where the model earns its place
BEAT 5  THE OUTCOME     dwell · depart      what shipped. what it cost. links dock
```

**BEAT 4 is non-negotiable and it is the differentiator.** Every portfolio in 2026 says
"AI-powered." Almost none says *where the model sits in the system and why that was the right
call.* One paragraph naming the model role, the failure mode guarded against, and the thing
deliberately **not** handed to a model.

**BEAT 5 docks the links** as in-world geometry — three plates that settle into the lower third,
lit, with real hover states: `LIVE DEMO ↗` · `SOURCE ↗` · `READ THE CASE ↗`. If there is no live
demo, the plate says `NO LIVE DEMO — WHY ↗` and links to the honest reason. That is more credible
than hiding it.

### 3.4 Palette direction

| World | Key | Value | Reference feel |
|---|---|---|---|
| THESIS | cool white | mid | clean, neutral |
| ABOUT | warm amber | **high-key** | daylight, human, a relief |
| THE WALL | graphite + single warm rake | low-mid | stone, weight, gravity |
| DEFECT PIPELINE | signal green on slate | mid-dark | terminal, controlled |
| GMAT ENGINE | paper cream + ink | **high-key** | printed page, literal light |
| DAVINA | cyan-white / warm rim | dark | keep as is — it earns it |
| LEDGER | near-white | **high-key** | index, catalogue, fast |
| CONTACT | deep blue → light | resolves up | ends bright, not black |

Ending on light instead of black is worth doing on its own. Right now the film ends in the same
darkness it started in, so the journey has no arc.

---

## 4. Content — the schema and the bar

### 4.1 New project schema

```js
{
  id, index, name, category, year,
  featured: true,
  // ── the claim, one line, concrete ──
  claim: 'Cuts triage-to-merge on production defects from days to hours.',
  // ── the five beats ──
  problem:    { head, body },   // body 45–70 words
  constraint: { head, body },
  build:      { head, body },
  ai:         { head, body, role, guardrail, notModel },
  outcome:    { head, body, metrics: [{ label, value, verified: true|false }] },
  // ── evidence ──
  stack:   ['Java 17', 'Spring Boot', 'PostgreSQL', 'GitLab CI'],  // technologies ONLY
  role:    'Architecture + agent design + validation',              // separate field
  links:   { live: url|null, repo: url|null, caseStudy: url|null, liveNote: string|null },
  // ── film ──
  world, accent, key: 'high'|'mid'|'low', grade
}
```

### 4.2 The bar — one project written properly

Quality reference. **Verify every number before it ships; delete any that cannot be verified.**

```js
{
  name: 'AGENTIC DEFECT PIPELINE',
  category: 'AI AGENTS / ENTERPRISE',
  year: '2025–26',
  claim: 'An agent pipeline that takes a production defect from ticket to reviewed merge request.',
  problem: {
    head: 'Triage was the bottleneck, not the fix',
    body: 'Production defects on a P&C insurance platform arrived as Jira tickets with a '
        + 'stack trace and little else. Before anyone could write a line of code, an engineer '
        + 'spent hours reconstructing context: which service, which recent change, what the '
        + 'logs said, whether the wiki already documented it. The fix was usually small. '
        + 'Finding out what to fix was not.',
  },
  constraint: {
    head: 'Zero external egress',
    body: 'Banking environment. No code, no logs, no ticket text may leave the network — '
        + 'which rules out every hosted agent product on the market. Whatever context the '
        + 'agent needed had to be reached through internally-hosted connectors, and every '
        + 'artefact it produced had to survive the same human review as any other change.',
  },
  build: {
    head: 'Custom agents, MCP-wired to the systems of record',
    body: 'GitHub Copilot custom agents connected over MCP to Jira, GitLab, the internal '
        + 'wiki, Postgres and Kibana. The agent reads the ticket, pulls the relevant logs, '
        + 'traces the failing path through the repository, checks the wiki for known context, '
        + 'and drafts a change with a written rationale. Every connector is internal; nothing '
        + 'crosses the boundary.',
  },
  ai: {
    head: 'The model reconstructs context. It does not decide.',
    role: 'Context assembly, hypothesis, first-draft patch',
    guardrail: 'No agent output reaches a branch without a human-reviewed MR. '
             + 'The pipeline is instrumented so a wrong diagnosis is visible before it is expensive.',
    notModel: 'Merge authority, test sign-off and the decision that a fix is correct '
            + 'stay with the engineer. Deliberately.',
    body: 'The interesting design question was not "can it write the patch" — it usually can. '
        + 'It was where to put the seam. Context assembly is exactly the work that is expensive '
        + 'for a human and cheap for a model with the right connectors. Judgement is the reverse. '
        + 'The pipeline is drawn on that line.',
  },
  outcome: {
    head: 'Merged to production',
    metrics: [
      { label: 'MRs approved and merged',  value: '[FILL]',  verified: false },
      { label: 'Median triage time',       value: '[FILL]',  verified: false },
      { label: 'Systems wired over MCP',   value: '5',       verified: true  },
    ],
    body: 'Agent-authored merge requests have been reviewed, approved and merged into '
        + 'production. My role shifted from writing the change to directing, validating '
        + 'and shipping it — which is the actual claim this project makes.',
  },
  stack: ['Java 17', 'Spring Boot', 'PostgreSQL', 'GitLab CI', 'MCP', 'Kibana'],
  role:  'Pipeline architecture · agent design · validation · deployment',
  links: {
    live: null,
    repo: null,
    caseStudy: '/case/defect-pipeline',
    liveNote: 'Runs inside a client network. Architecture and results are documented in the case study.',
  },
  key: 'mid',
}
```

Roughly 320 words per project, in five beats, each beat readable in one dwell.

### 4.3 Copy rules

1. No sentence that could appear on any other portfolio.
2. Ban list: *seamless, robust, cutting-edge, leveraging, revolutionise, game-changing,
   passionate, journey, elevate, unlock, empower.*
3. Never invent a metric. Emit `[FILL]` and list it in `VERIFY.md` rather than guess. A false
   number is the only unrecoverable error on this site.
4. Name the trade-off made and the thing not done. That is what reads as senior.
5. `stack` = technologies. Not "Systems Design." Not "UX."
6. Every headline ≤ 6 words. Every body 45–70 words — one dwell's worth of reading.
7. British spelling throughout. (v1 mixes *"colour grade"* and *"atomize"*.)

---

## 5. Execution phases

Show the plan and wait for approval before each phase. After each phase, report in three lines:
what changed, what is least certain, what is needed from the author.

| Phase | Deliverable |
|---|---|
| **P0** | Amend `SHOTLIST.md` with R1–R7. Add `core/beat.js` (beatCurve + dwell policy) and `core/transitions/` (aperture, whip-pan, rack-focus, light-lead). Retrofit `ThesisShot` to the dwell model as the proof. **STOP — review a frame.** |
| **P1** | Rewrite `data/projects.js` to the new schema. Content only, no 3D. Emit `VERIFY.md` listing every `[FILL]`. **STOP — author fills the numbers.** |
| **P2** | THE WALL, end to end, including the aperture in and the gas return out. **STOP.** |
| **P3** | Flagship world #1 to full quality, all five beats. It sets the bar. **STOP.** |
| **P4** | Worlds #2 and #3 against that bar. |
| **P5** | ABOUT, THE LEDGER, CONTACT. |
| **P6** | Palette and grade pass — R4 across the whole film in one sitting, so keys are judged against each other rather than in isolation. |
| **P7** | Accessibility pass (R6), then the profiler and optimisation pass (R7). Optimise by REMOVAL: freeze static shadow maps, drop MSAA the composer never uses, move particle animation into the vertex shader, cache per-frame traverse results. |

**Do not rewrite** `ShotSystem`, `GasTransition`, `Post`, `Grade`, `Text`, `math`, `motion`,
`Assets`, or the `compileAsync` warm-up loop in `main.js`. That warm-up is load-bearing —
removing it reintroduces a 300–530ms main-thread freeze per world. Every change must trace to a
numbered item in this document.

Verify frames with the existing dev harness (`__GAS.shoot / sheet / pump / fly`). Do not
benchmark in the embedded pane — `HANDOFF.md` §2 explains why absolute timings from it are
meaningless.

---

## 6. Where the effort goes

| Phase | Effort | Impact |
|---|---|---|
| P0 — dwell model | small (one helper + one retrofit) | **highest in the document** |
| P1 — content | medium, mostly writing | very high |
| P2 — THE WALL | large | high |
| P6 — palette | small | high — complaint #4 is mostly six numbers |
| P3–P5 — worlds | largest | medium — diminishing after the first |

If only two things get done: the dwell model (P0) and the content rewrite (P1). Between them
they fix four of the six complaints, and neither needs a single new shader.

---

## 7. One caution

`HANDOFF.md` §5 records that frame rate has never been measured on real hardware and there has
been no mobile testing. Awwwards runs a separate Mobile Excellence track requiring 70/100 against
Google's mobile criteria before a site reaches the design jury — and the main rubric is Design 40
/ Usability 30 / Creativity 20 / Content 10. A nine-world half-float composer with a large mipmap
bloom on a tile GPU is the exact profile that fails there.

Do P7 on a real phone, not in the pane. If the three-world version runs at 60 on a mid-range
Android and the six-world version runs at 40, the three-world version is the better *film*, not
just the cheaper one.
