# GAS — brand marks

Six logo routes for **GAS** (Govada Akash), all drawn from one geometric alphabet.
Nothing here is type: the letterforms are paths, so the marks render identically
everywhere with no font to load, license or fall back.

## The alphabet

Cap height 100, stroke 13, round terminals.

| Letter | Construction |
| --- | --- |
| **G** | a true circle at radius 43.5, broken by a 45° aperture on the upper right; the bar runs from the exact centre out to the aperture |
| **A** | a 40 : 85 isoceles on the same optical width, crossbar at y 63 |
| **S** | two tangent circles of radius 22 stacked on the cap height |

See `gas-construction.svg` for the grid.

## The routes

| # | Mark | Form | Best at |
| --- | --- | --- | --- |
| 01 | `gas-molecule-g` | single letter | favicon, app icon, loader |
| 02 | `gas-wordmark` | primary wordmark | site header, README, print |
| 03 | `gas-condensation` | display wordmark | hero title, poster, social card |
| 04 | `gas-ringed-g` | single letter | sticker, avatar, watermark |
| 05 | `gas-constellation` | letterless emblem | avatar, section motif, merch |
| 06 | `gas-mission-patch` | badge lockup | GitHub avatar, stickers, merch |

Each ships in two files:

- `<name>.svg` — full colour, using the site palette from `style.css`
- `<name>-mono.svg` — single colour via `currentColor`, so it inherits the
  surrounding text colour and works on any ground

```html
<!-- mono marks take their colour from CSS -->
<span style="color: #eaf0ff"><!-- inline gas-wordmark-mono.svg --></span>
```

## Palette

Inherited from `style.css` — violet `#7b5cff`, cyan `#00e5ff`, magenta `#ff4dd8`
on void `#010104`.

Colour marks use a `userSpaceOnUse` gradient that runs across the whole lockup.
This matters: an `objectBoundingBox` gradient is undefined on a zero-height
bounding box, which silently drops horizontal strokes like the G bar and the A
crossbar, and it would also restart the ramp on every letter.

## Regenerating

```bash
node brand/build.mjs
```

Tracking, stroke weight, aperture angle, star positions and colour stops are all
constants at the top of the script — change one and every affected SVG is rebuilt.

## Note on route 06

The mission patch sets its rim text in Syncopate via `font-family`. Before using
it anywhere the font is not guaranteed (print, merch, another site), convert the
two `<text>` elements to outlines.
