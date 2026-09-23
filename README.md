# GAS — Ideas taking form

Akash’s portfolio as a continuous scroll journey with different motion in each chapter. Native document scrolling stays intact: no wheel interception, full-page slideshow, or forced autoplay.

## Run

```sh
npm ci
npm run dev
```

Open http://localhost:5173. Build with `npm run build`; inspect production with `npm run preview`.

## The journey

1. **Opening:** a photographic architectural aperture. Scroll pushes into the light while the first title rises away and a second frame resolves over the same scene. Pointer movement shifts the light haze; a press briefly brightens it.
2. **Threshold:** independently floating discipline labels bridge the opening and the work.
3. **Work:** a pinned horizontal passage through eleven substantive projects on desktop. Phones and reduced-motion users get a native swipeable gallery with previous/next controls.
4. **Inside the build:** a vertical project story beside a sticky heading. Any project card or index entry can select the story; the selector can change it in place.
5. **Collection, person, closing:** all fourteen public repositories, a large typographic reveal, and a slower architectural contact frame.

## Implementation

- `index.html`: semantic page chapters and index dialog.
- `src/main.js`: GSAP/ScrollTrigger choreography, project rendering, case selection, search, loading, and ambient particles.
- `src/style.css`: layouts, project artwork, responsive gallery, static/reduced-motion presentation.
- `src/data/catalog.js`: repository audit and project stories.
- `public/work/aperture.png`: generated cinematic photographic artwork, created with the built-in image generation tool. Exact prompt and provenance are in `public/work/aperture-prompt.txt`.
- `public/work/daymark.jpg` and `gmat.jpg`: public deployment screenshots; GMAT shows its entry screen.

The previous Three.js shot systems in `src/core`, `src/shots`, `src/ui`, and `src/visual` are retained as earlier explorations and are not imported by the current entry point. `SHOTLIST.md` and `HANDOFF.md` describe those earlier versions.

## Validation

With the dev server running, `node scripts/check-journey.mjs` checks the opening, native scroll, desktop horizontal travel, mobile/reduced-motion gallery, project stories, repository index, contact, image loading, document overflow, and browser errors. Screenshots go to `.frames/`, which is ignored by Git. The script currently uses installed Windows Chrome.

`node scripts/capture-projects.mjs` refreshes project screenshots without signing in or changing remote data.

## Content provenance

Public repository metadata, READMEs, and relevant source were reviewed on September 23, 2026. All fourteen public repositories are represented, including README-only and empty archives. The separate Stock Simulator has not been located and needs its GitHub repository name or URL.

Daymark loaded during review. Café POS’s product service and GMAT Trainer’s guest question bank were unavailable; their status is stated in the project stories. Other preview links come from repository metadata and do not imply operational backend services. MoneyFest explains observed stock moves; Job-Agent creates search plans; Housing Predictor uses small illustrative learning datasets.

Project artwork is labelled as a design/system study or an actual capture. The aperture is generated artwork, not a photograph of a claimed personal project. The legacy Earth texture is from [Solar System Scope](https://www.solarsystemscope.com/textures/) under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

There is no contact backend, analytics, automatic GitHub sync, or credential requirement. Contact opens an email link.
