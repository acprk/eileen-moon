---
name: biopic-film
description: End-to-end multi-agent workflow for a procedural hand-drawn biographical music film (code-drawn, no AI images) cut to a full song, in the style of a reference film — concept, narration, engine, parallel scene agents, review rounds driven by user feedback, render, Bilibili delivery. Use when starting or continuing such a film.
---

# Procedural biopic film workflow

```
 user brief + reference film + song
        │
 [film-director]  Phase 0  concept · song-analysis · narration-script ──► [fact-checker]
        │         Phase 1  engine libs · pilot · BRIEF.md (film-brief rules)
        │
        ├──► [figure-artist ×2]   heroine pose library (stub API first)
        ├──► [scene-artist ×6]    one segment file each (A+G, B, C, D, E, F)
        │         └─ loop: stills-review (≥3 rounds) ─┐
        │◄────────────── hand-back + contact sheet ───┘
        │         Phase 3  director/art-reviewer review → SendMessage revision rounds
        │                  user feedback → shared-lib change (e.g. text-matter) + BRIEF update
        │
 [render-engineer] Phase 4  render-and-master → bilibili-publish
```

## Phases and gates
| Phase | Output | Gate |
|---|---|---|
| 0 Concept | style notes from the reference, beats.json, lyrics timing, script.ts, SCRIPT.md | fact-checker: every quote verbatim, every fact sourced |
| 1 Engine | src/lib/*, pilot scene, tools/stills.mjs, BRIEF.md | pilot stills read by the director; typecheck clean |
| 2 Production | src/scenes/segA…G.ts, src/lib/eileen_*.ts | each agent ≥3 review rounds; sheet in stills/ |
| 3 Review | revision rounds | no must-fix left from art-reviewer / user |
| 4 Delivery | output/*.mp4, cover, srt, description | full decode clean, −14 LUFS, plays in hardware players |

## What actually happened in this repo (calibration)
- 8 parallel agents (2 figure, 6 scene), 2 user feedback rounds. Round 1 asked for more quotations, more on her
  early fame and on the ocean crossing, more detail. Round 2 changed the style: "fewer cartoon animations, more
  like the reference" → new shared lib `textmatter.ts`, all segments converted, red manuscript grids removed,
  flat-yellow shots regraded to night + lamp light, film shortened to 4:45.
- ≈ 3.4 M tokens in total (≈ 3.2 M in sub-agents), 14.5 k lines of code, 6852 frames, ~25 min render at 1080P
  on 8 Chrome workers.

## Principles
1. One brief, one engine, many artists: shared libs are owned by the director; artists own one file each.
2. Read the pictures, not the reports.
3. Every user remark becomes a concrete, owner-addressed instruction in the same turn.
4. Facts and quotations are sacred; invented specifics are removed.
5. Third-party audio/lyrics/footage never go into the repository or the release.
