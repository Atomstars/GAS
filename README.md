# GAS — Akash / Atomstars

A portfolio built around verified implementation evidence: AI reasoning, full-stack applications, automation, and creative web experiences.

## Run

```sh
npm ci
npm run dev
npm run build
npm run preview
```

The local site runs at http://localhost:5173. No credentials or backend are required. External previews may require their own services.

## Current experience

- Charcoal, warm ivory, and orange art direction with responsive typography.
- Custom GAS SVG wordmark and favicon; large GAS hero; exploded Three.js system architecture with pointer response, scroll-driven perspective, and explicit expand/reassemble control.
- Four-layer technology explorer: selectable 3D planes, animated technology tiles, project counts, and clickable implementation evidence.
- Six selected projects with a wide lead frame, layered interface/system studies, distinct environments, scroll-responsive perspective, touch feedback, and category filters.
- Interactive 3D system routes for local GMAT tutoring, Buddy reflections, and MoneyFest attribution. Play/pause, manual stages, explanations, and source links connect each animation to implementation. A separate SDLC strip explains the development process. MoneyFest’s outcome examples remain in an optional, plain-language deeper dive. All routes are illustrative, not live API or model execution.
- Searchable archive of all 14 public repositories, including source-only projects and empty archives.
- Case-study dialogs with implementation details, technology lists, repository links, and listed previews.
- Cinematic closing frames, spatial GAS typography, and a layered contact portal.
- Native scrolling, keyboard tabs/dialogs, touch feedback, motion controls, reduced-motion support, and offscreen/hidden-tab 3D suspension.

Project artwork is explicitly labelled as interface/system studies. Existing actual deployment captures appear in relevant project details and are dated September 23, 2026. Contact opens the existing mailto address; no form submission service is implied.

## Active files

- `index.html`: semantic page, navigation, sections, dialogs, and metadata.
- `src/studio.js`: technology explorer, filtering, case studies, archive, typing, and pipeline interactions.
- `src/studio.css`, `src/studio-art.css`, and `src/cinema.css`: responsive presentation and procedural project illustrations.
- `src/visual/StudioSculpture.js`: lazy-loaded hero and request-route 3D scenes with lifecycle and fallback handling.
- `src/systemExplorer.js`: three source-based architecture routes, stage explanations, and playback.
- `public/gas-wordmark.svg` and `public/favicon.svg`: custom vector brand assets.
- `src/data/studioCatalog.js`: current source corrections, extending `src/data/catalog.js`.
- `research/github-audit.json`: repository trees, commit identifiers, READMEs, manifests, and selected implementation snapshots.
- `research/REVIEW.md`: scope, evidence, and important corrections.

The earlier entry files, galaxy/matter work, shot systems, and tests are retained as previous explorations; they are not imported by the current page. Existing uncommitted entry files were backed up under the ignored `.frames/before-redesign/` before replacement. The first studio iteration was also saved in `.frames/before-cinema/`. `HANDOFF.md` and `SHOTLIST.md` refer to the earlier design.

## Verify

With the local server running:

```sh
node scripts/check-cinema.mjs
```

The current browser check uses installed Windows Chrome and Playwright. It covers project filters, technology evidence, keyboard tabs, dialogs, archive search, pipeline branches, responsive overflow at 320–1440px, reduced motion, touch interaction, and WebGL fallback. Screenshots are saved to the ignored `.frames/` directory. `npm run build` validates the production bundle.

## Content scope

Public GitHub metadata, trees, READMEs, dependency manifests, and selected source were reviewed on September 26, 2026. This is a source review, not a production certification or exhaustive audit of every line. The portfolio makes no unverified claims about employment, business impact, user counts, or autonomous operation.

Notable corrections: Tutor-Agent currently persists to MongoDB and returns a template tutor response; MoneyFest has an implemented gated attribution/verifier pipeline; Buddy has Groq reflections with deterministic fallbacks. Source links let visitors inspect the implementation directly.
