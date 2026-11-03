---
name: pen-engine
description: How to draw "hand-drawn" imagery in code with src/lib/pen.ts, ground.ts and type.ts — SVG paths flattened to polylines, variable-width pressure ribbons with wobble and 8 fps line boil, progressive reveal, hatching, watercolour washes, procedural paper/night grounds, the moon, vertical handwriting. Use when writing or fixing any scene or figure.
---

# Pen engine cheat-sheet

```ts
import { pathPolys, place, penDraw, penPath, penStroke, sketchLine, sketchEllipse, hatch, wash } from '../lib/pen'
penPath(ctx, 'M 100 400 C 180 300 260 300 340 400', prog(t, 2, 4), { width: 2.2, color: C.lineNight, boil: 8, t })
const house = place(pathPolys(HOUSE_D), x, y, s)   // author in a 1000-unit box, place once, cache
penDraw(ctx, house, progress, { width: 1.6, color: C.ink, boil: 8, t, passes: 1 })
hatch(ctx, roofD, { angle: -0.9, gap: 7, progress: p })
wash(ctx, qipaoD, C.rouge, { alpha: 0.5, progress: fill })
```
- Stroke = filled ribbon: tapered ends (`taperIn/Out`), pressure noise, centre-line wobble (`wobble`, `wave`),
  `boil` re-seeds the wobble N times per second (hand-redrawn animation), `progress` reveals from the start with a
  heavier nib. `penDraw` reveals many strokes in order (a figure is "drawn").
- Grounds: `nightPaper` (indigo, fibres — never flat black), `oldPaper` (aged xuan, stains, sepia),
  `moon(ctx, x, y, r, {glow, phase, wet})`, `glowAt`, `rain`.
- Type: `subtitle` (global, from script.ts), `writeVertical` (竖排, char by char; vertical punctuation ︙﹁﹂),
  `yearMark`, `lyricRail`.
- Determinism: use `rand(i, seed)`; cache static drawings with `cached(key, w, h, draw)`.
- Composition: keep y > H·0.76 and the right 90 px clear; camera moves via ctx transforms; depth layers.
