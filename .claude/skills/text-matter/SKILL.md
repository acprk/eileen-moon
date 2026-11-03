---
name: text-matter
description: Build images out of the subject's own words (src/lib/textmatter.ts) — any mask rendered as a field of characters that emerges over time, perspective planes of words (sea, street), falling characters, surfacing sentences. The style the user preferred ("像参考片那样"). Use for main subjects of shots.
---

# Text as material

```ts
import { textImage, textPlane, textRain, floatLines, CORPUS } from '../lib/textmatter'
// a figure surfacing out of characters, bottom-up
textImage(ctx, { key: 'B4-girl', cell: 10, gamma: 1.6, emerge: prog(t, 60.2, 63), order: 'sweepYUp', t,
  corpus: '像月光底下的黑影中现出青白的粉墙片面的癫狂的',
  draw: (g) => eileen(g, 'girlWindow', { x: 720, y: 560, h: 380, color: '#fff', dress: '#666', fill: 1, weight: 3.5 }) })
textPlane(ctx, { y0: 330, t, light: 0.9, lightX: 900 })             // a sea of titles with a moon column
textRain(ctx, t, { n: 140, alpha: 0.4 })                             // rain of characters
floatLines(ctx, t, [{ text: '因为懂得，所以慈悲。', x: 1300, y: 160, t0: 4, t1: 10, vertical: true }])
```
- Masks are cached per `key` (draw once, white = image, grey = partial). Thick white contours + mid-grey fill +
  `gamma` 1.4–1.8 make features read brighter than bodies. `cell` 8–11 for figures, 14–28 for big forms.
- `order`: random / radial (from ox, oy) / sweepX / sweepY / sweepYUp; `scatter` = fly-in distance.
- Corpus = verbatim lines relevant to the shot (the robe woven from 《天才梦》, the moonlight from 《私语》).
- Pen lines become traces over the text image (alpha 0.2–0.4), not the main drawing.
