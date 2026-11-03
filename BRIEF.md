# 《一个有月亮的晚上》 — 张爱玲手绘传记短片 · team brief

A ~5-minute hand-drawn (程序化手绘) biographical film of 张爱玲 (Eileen Chang, 1920–1995), cut to the full song
赵雷《程艾影》 (300.4 s, 117.45 BPM). The song is widely read as a veiled 张爱玲/胡兰成 story (程艾影 ≈ 张爱玲,
伍岚正 ≈ 胡兰成, 常德路 = her Eddington House flat, "从上海到武汉" = his 1944 move to Wuhan,
"尘埃里花" ≈ her "低到尘埃里…从尘埃里开出花来"). The user is a devoted 张爱玲 reader: every fact and quotation
must be right, and the work must feel literary, restrained and professional.

**Narrator: the moon.** 《金锁记》 opens "三十年前的上海，一个有月亮的晚上" and closes "三十年前的月亮早已沉下去".
The moon she wrote about tells her life ("我是一个月亮。她写过我很多次。"). The moon is the film's single warm
light (like the amber light bar in the reference film) and appears in every segment — a window, a puddle, the sea.

Reference film (style of narration, pacing, bilingual subtitles, text-as-material, end credits):
`ref.mp4`, contact sheets in `ref_frames/sheet_01..08.jpg` (Read them).

## ★ Style update (user feedback, round 2) — READ FIRST
The user loved the text-sea (segment G) and the ink-bleed transition, and wants the whole film to look more like
the reference `ref.mp4`: **fewer cartoon-like illustrated animations, more images made of her words and light.**
- New lib `src/lib/textmatter.ts`: `textImage` (any mask → a field of characters that EMERGES: 人物从文字里逐渐浮现),
  `textPlane` (perspective sea/street/floor of words with a light column), `textRain` (falling characters),
  `floatLines` (her sentences surfacing and dissolving), `CORPUS`, `mask`. See `src/lab/textlab.ts` for usage.
  Tip for figures: draw the mask with thick white contour lines (weight 3–4) and a mid-grey fill (≈ #666) and use
  `gamma` 1.4–1.8 and `cell` 9–11 so contours and features read brighter than the body.
- Every shot should contain text-matter; at least half the shots should have their MAIN subject made of text
  (a figure, a building, the moon, a ship, a city…). Pen lines stay as sparse hand-drawn traces/accents (a contour
  being drawn, a horizon, a window frame, a signature), not full cartoon illustrations; avoid flat cartoon fills.
- More of her sentences surfacing in space (`floatLines`) — verbatim only (src/data/script.ts, SCRIPT.md).
- Pacing like the reference: fewer, longer, contemplative shots in verses; beat-cut energy in choruses/climax.
- Light: the moon's warm light, soft glows, light columns; darkness is indigo, never flat black.

## Format
- 1920×804 (2.39:1), 24 fps, whole song 0–300.4 s. Global time `t` in seconds everywhere.
- Narration subtitles (`src/data/script.ts`) and the vertical lyric rail (`src/data/lyrics.ts`) are drawn
  globally by the compositor — **do not edit those files**; propose changes in your report.
- Keep **y > H·0.76 (≈ 611 px) free of important detail** (subtitles) and the **right 90 px** clear (lyric rail).

## Visual language
1. **Hand-drawn, visibly.** Meaningful forms are drawn with the pen engine (`penDraw`/`penPath`/`penStroke`),
   revealed stroke by stroke (`progress`), with line boil (`boil: 8, t`). Shading by `hatch`, colour by `wash`
   (watercolour). No flat vector fills, no photos, no AI images, no emoji.
2. **Two grounds.**
   - Night: `nightPaper` (indigo ink-dyed paper — never flat black) + pale chalk-blue lines `C.lineNight`;
     the warm `moon(...)` is the only warm light.
   - Memory/day: `oldPaper` (aged xuan paper) + sepia ink `C.ink`; restrained washes (`C.rouge` for qipao / red
     rose / 婚书, `C.jade`, `C.gold`). Colour is precious — use it as an accent, not wallpaper.
3. **Composition for scope 2.39:1.** Wide, asymmetric, deep. Use diagonals, depth layers, overlap, negative space,
   frames-within-frames (windows, doors, photographs). **Never line figures/objects up flat in a row.** Avoid
   huge empty dark areas with nothing drawn; avoid filling every inch either.
4. **Every shot moves.** Slow camera push/pan/tilt via ctx transforms; parallax between layers.
5. **Text as material** (from the reference): her titles, her characters' names, her sentences can become
   matter — sea made of characters, rain made of strokes, a city of book titles. Use where it means something.
6. **Literary restraint.** Quiet verses, kinetic choruses. Avoid cheesiness (no hearts, no sparkles, no lens
   flares); prefer ellipsis and implication (an empty chair, a hat, a closed door).
7. **Faces.** 张爱玲 appears through `eileen(ctx, pose, opts)` (src/lib/eileen.ts) — one consistent heroine
   (agents H1/H2 are drawing the real figures now; the current versions are stubs, so stage with the stub and
   trust the API: bottom-centre anchor, height `h`). Other people (胡兰成, mother, father, 赖雅) are never shown
   with detailed faces: silhouettes, backs, hands, hats, shadows.

## Beat sync (卡点)
- `src/lib/math.ts`: `BEATS` (beat times), `beatIndex(t)`, `beatTime(i)`, `nearestBeat(t)`,
  `beatPulse(t, decay, every)`, `beatPos(t)`. 1 beat ≈ 0.511 s, 1 bar = 4 beats ≈ 2.04 s.
- Scene cuts land on beats (use `beatTime(i)` for t0/t1, or the segment boundaries in `script.ts`).
- Choruses (76.3–96.3, 176.9–194.3) and the climax (211.6–245.2): strokes, washes, cuts and text hits fall on
  beats / bars; cut every 2–4 bars. Verses: calmer, change on lyric-line starts (`src/data/lyrics.ts`).
- Song map: intro 0–41 (quiet, energy rises at 23.8) · verse 1 41.5–76.3 · chorus 1 76.3–96.3 · interlude
  96.3–110.6 · verse 2 110.6–143.2 · pre/post 143.2–160.8 · interlude 160.8–176.9 · chorus 2 176.9–194.3 ·
  post 194.3–211.6 · instrumental climax 211.6–233 · hum 233–245 · **drop/silence ≈ 247.8** · outro 252.3–270 ·
  tail 270–300.

## API (read the sources, they are short)
- `src/lib/film.ts` — `Scene { id, t0, t1, theme: 'night'|'paper', trans?: {kind, dur}, draw(ctx, t, lt), noSubs?,
  noLyrics?, grain?, vignette? }`. Transition kinds: `cut | dissolve | ink | flash | burn | whiteout`; a transition
  INTO scene S runs over [S.t0, S.t0+dur] while the previous scene keeps drawing, so draw() must cope with t a
  little past its own t1.
- `src/lib/pen.ts` — `pathPolys(d)` (SVG path → polylines; M L H V C S Q T Z, no arcs), `place(polys, tx, ty, s)`,
  `penStroke`, `penDraw(ctx, polys, progress, style)`, `penPath(ctx, d, progress, style)`, `sketchLine`,
  `sketchEllipse`, `hatch(ctx, region, {angle, gap, progress, cross, ...style})`, `wash(ctx, region, color, {alpha,
  blur, progress})`. PenStyle: width, color, alpha, wobble, wave, pressure, taperIn/Out, boil, t, seed, passes, op.
- `src/lib/ground.ts` — `nightPaper`, `oldPaper`, `moon(ctx, x, y, r, {glow, alpha, phase, wet, t})`, `glowAt`,
  `rain`.
- `src/lib/type.ts` — `writeVertical` (稿纸 vertical writing, char-by-char), `yearMark`, `subtitle` (only if you set
  `noSubs` and place text yourself — then render the cue's zh and en exactly as in script.ts at its times).
- `src/lib/texture.ts` — `cached(key, w, h, draw)` for expensive one-time offscreen drawing, noise fields.
- `src/lib/eileen.ts` — `eileen(ctx, pose, {x, y, h, progress, fill, t, color, dress, alpha, flip, boil, weight})`.
- `src/config.ts` — `W, H, FPS, C` (palette), `FONT` (zh = Noto Serif CJK SC, kai = AR PL UKai CN, en = EB Garamond).

Determinism: frames render out of order in parallel. No `Math.random`, no state carried between frames
(caches of pure data/drawings are fine). Use `rand(i, seed)`.

Performance: aim ≤ 1.5 s per frame (the stills tool prints ms). Cache static drawings with `cached` + drawImage
when a layer is finished drawing and only moves.

## Workflow
- **Own only your files** (listed in your task). Don't edit lib files, data files or other agents' files.
  If the lib lacks something, write a local helper in your own file. Report lib bugs.
- Preview: `node tools/stills.mjs --mod src/scenes/segX.ts --tag X --sheet 42 45 48.5 ...` → PNGs in
  `stills/` + `stills/X_sheet.jpg`. **Read the images and critique them like an art director** — at least three
  rounds of draw → look → fix. Check: hand-drawn feel, composition (no flat rows), clarity of the idea,
  subtitle zone clear, consistency with the palette, nothing ugly or crude.
- Type check: `npx tsc --noEmit`.
- Do not render video, do not run more than one stills process at a time, keep to ≤ 12 frames per call.
- Shell rules (from the workspace CLAUDE.md, strictly): one simple command per Bash call; no `python -c`,
  `node -e`, heredocs, `sed -i`, pipes chaining many commands. Edit files with Edit/Write only.
- Final report (≤ 300 words): shot list with times and what is drawn, beat hits, perf (ms/frame), the path of
  your final contact sheet, and any proposed script/lyric changes or lib issues.
