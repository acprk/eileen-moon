---
name: stills-review
description: The draw → look → fix loop. Render chosen frames of one module with tools/stills.mjs (bundle once, one browser, many frames, isolated from other agents' work-in-progress), read the contact sheet like an art director and fix. Use after every change to a scene or figure.
---

# Stills review loop

```bash
node tools/stills.mjs --mod src/scenes/segD.ts --tag D --sheet 114.5 118 125.5 133 141 146.8
node tools/stills.mjs --mod src/lab/figH1.ts --tag H1 --sheet 3.5 4.5 20.5 21.5   # figure lab
node tools/stills.mjs --tag full --sheet 10 60 120 180 240                        # whole film
```
- `--mod` registers only that module's scenes, so another agent's broken file can't break your bundle.
- Output: `stills/<tag>_<t>.png` + `stills/<tag>_sheet.jpg` (2 per row, time-stamped). Timing per frame is printed
  (includes cold-cache builds; warm frames are faster).
- Pick frames at: each cut + 0.3 s, mid-shot, every beat-hit moment, the subtitle's longest line, transitions.
- Read the sheet, then single PNGs for close-ups. Use the art-reviewer checklist. Fix, re-render, ≥ 3 rounds.
- Never more than one stills process per agent; ≤ 12 frames per call.
