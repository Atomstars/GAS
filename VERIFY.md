# VERIFY — numbers that are not yet real

Every figure below renders on the site as a visible `[FILL]` placeholder with a
"not yet verified" flag. **Nothing here is guessed, rounded or inferred.** A fabricated
metric is the only unrecoverable error on a portfolio: it is the one thing that, if
caught, discredits everything around it — including the parts that were true.

Fill these in `src/data/work.js` and set `verified: true`. If a number cannot be
verified, delete the metric rather than softening it. Three real numbers beat six
approximate ones.

---

## 01 · Agentic Defect Pipeline

| Metric | Status | What I need |
|---|---|---|
| Systems wired over MCP | ✅ `5` | Jira, GitLab, wiki, Postgres, Kibana — confirm this is still the full set |
| MRs approved and merged | ⬜ `[FILL]` | How many agent-authored merge requests have actually reached production? An exact count, or a floor you are certain of ("more than 20") |
| Median triage time, before → after | ⬜ `[FILL]` | Only if you measured it. If it was never instrumented, delete this row — "hours to minutes" without a measurement behind it is exactly the kind of claim an interviewer will probe |

**Also confirm:** that describing the client as "a P&C insurance platform" in "a banking
environment" is within what you are permitted to say. If not, generalise to "a regulated
financial services platform" — the architecture is the interesting part and it survives
the generalisation.

## 02 · GMAT Verbal Engine

| Metric | Status | What I need |
|---|---|---|
| Regression tests in the suite | ✅ `63` | From your own brief — confirm it is still 63 |
| Questions indexed | ⬜ `[FILL]` | Row count in Qdrant, or however many records the parser produced |
| Retrieval precision @5 | ⬜ `[FILL]` | Only if the regression suite actually reports it. If it reports pass/fail rather than precision, replace this row with "suite pass rate" and give the number |

## 03 · Davina Aerospace

| Metric | Status | What I need |
|---|---|---|
| Surfaces consolidated | ⬜ `[FILL]` | How many separate tools/screens did this replace? A small honest number ("4") is fine and specific |
| Shipped | ⬜ `[FILL]` | Is it deployed, used by anyone, or a build? Say plainly which. "Prototype" stated openly reads better than "shipped" left ambiguous |

---

## Assets still needed

The heroes on the site are **rendered stand-ins**, not screenshots — built in markup
from your real stack and content so the page is complete now. Each is one function in
`src/heroes.js`; swapping in a real capture is replacing a return value with an `<img>`.

Highest value first:

1. **GMAT engine** — a screen capture of the practice interface and one of a retrieval
   result. This is the project with the least to hide and the most to show.
2. **Davina** — the operations surface. Even a partial capture beats a diagram.
3. **Defect pipeline** — assumed impossible to capture. The sanitised architecture
   diagram and the case study stand in for it, and the site says so on the page rather
   than leaving a gap where a demo link should be.

## Copy still to check

- The claim on each project is the sentence a sceptical senior engineer will read first
  and probe hardest. Read all three aloud and delete any word you could not defend.
- `stack` lists technologies only. If anything creeps back in that is a discipline
  rather than a technology ("Systems Design", "UX"), it belongs in `role`.
