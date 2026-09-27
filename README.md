# GAS — Akash / Atomstars

A portfolio of real engineering projects, readable architecture, and an interactive idea-to-product opening.

## Run

```sh
npm ci
npm run dev
npm run build
npm run preview
```

Open http://localhost:5173. No backend or credentials are required.

## Current experience

- The opening is a reversible four-chapter film controlled by ordinary scrolling. Money, time, and wellbeing ideas converge into a product direction, connect to React / Node.js / Supabase / Groq, then resolve into an interactive Buddy product study. It uses DOM, SVG, and CSS perspective rather than a video file, so the final product remains usable.
- Play/pause, replay, direct chapter buttons, and a native range control provide alternative ways to navigate the film. Pointer depth and touch feedback accompany the transitions. Reduced motion removes the long pinned scroll and exposes the same chapters directly. Animation work stops when settled, offscreen, or in a hidden tab.
- Buddy's Overview, Planner, and Reflections views use labelled sample content. Planner checkboxes retain their state in memory while switching views. This is a portfolio interaction, not a connection to the Buddy backend or an AI provider.
- Dark graphite is the default; light mode uses neutral ivory. The lighting command is a physical-looking local instrument with a recessed lamp, press feedback, a charging pulse, and an expanding theme reveal where View Transitions are supported. `lights.on()` and `lights.off()` are allowlisted commands, never evaluated JavaScript. Storage failure and reduced motion are supported.
- Three logo directions—Cutline, Aperture, and Editorial—are available through **Logo concepts** in the header. Each has light/dark previews and its own favicon. Selecting one updates the header and footer and persists on the current device. Editorial is the initial direction.
- Six selected projects, category filters, source-linked project dialogs, and a searchable archive covering all 14 public repositories remain available.
- Three compact architecture walkthroughs explain local GMAT tutoring, Buddy contextual reflections, and MoneyFest attribution/verification. Manual steps, playback, alternate outcomes, source links, and a shared inspector expose how the systems work.
- Four engineering disciplines connect the technology stack to implementation evidence. No invented user counts, business outcomes, or production certifications are claimed.

## Active files

- `index.html`: page, film scenes, interactive product markup, dialogs, and metadata.
- `src/workbench.js`: projects, archive, technology evidence, system walkthroughs, and accessibility interactions.
- `src/productEngine.js`: film timeline, scroll/playback coordination, product interactions, and motion preferences.
- `src/product-film.css`, `src/cinema-opening.css`: film composition and responsive frames.
- `src/kinetic.js`: lighting commands, transitions, and persistent themes.
- `src/identity.js`, `public/identity/`: logo previews, selection, and vector assets.
- `src/atelier.css`: neutral palette and logo comparison panel.
- `src/systemMap.js`: measured SVG system connections and request signals.
- `src/workbench.css`, `src/workbench-projects.css`, `src/kinetic.css`, `src/foundry.css`: shared site, project, and compact architecture styling.
- `src/data/studioCatalog.js`, `src/data/toolkit.js`, `src/data/systems.js`: project facts, technologies, and source-based architecture descriptions.

Earlier explorations remain on disk as references. `ProductAssembly.js`, `SignalWorld.js`, `IdeaEngine.js`, and `productFoundry.js` are not imported by the current experience. The production opening does not load Three.js or require Canvas/WebGL.

## Verification

With the development server running:

```sh
node scripts/check-product-film.mjs
node scripts/check-film-layout.mjs
node scripts/capture-film.mjs
npm run build
```

The browser check uses installed Windows Chrome and Playwright (`CHROME_PATH` can override its location). It covers the scroll timeline, playback/pause, chapters, product tabs and tasks, theme validation/persistence, all logo options, dialogs/focus restoration, project filters, archive search, architecture paths, keyboard navigation, reduced motion, touch, blocked storage/canvas, overflow and diagram overlap at 320–1920px, and browser errors. The capture script saves storyboard frames under ignored `.frames/`.

Older foundry/kinetic checks target retired openings and are retained as reference; use the commands above for the current implementation.

## Design and content references

Silvia Malavasi, DAQ Consulting, LaunchFar, and the supplied Arc design-directory collection were reviewed in a browser for typography, motion, and composition. The supplied Medium article blocked browser access. No external artwork or layouts were copied. Review details are in `research/DESIGN-REFERENCES.md`.

Project descriptions preserve the September 26 source audit in `research/github-audit.json` and `research/REVIEW.md`. Tutor-Agent uses MongoDB and template responses; MoneyFest uses gated attribution and verification; Buddy combines Groq reflections with deterministic fallback behavior. Public project previews may require their own backend services.
