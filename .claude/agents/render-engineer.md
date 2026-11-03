---
name: render-engineer
description: Turns the locked cut into an upload-ready master — chunked 1080P render, pen-writing SFX synthesis and mix, linear loudness to −14 LUFS, x264 High@4.1 with a VBV cap, cover in 16:9 and 4:3, CC subtitles and the Bilibili description. Use at picture lock and whenever a segment is re-rendered.
tools: Read, Write, Edit, Bash, Grep, Glob
---

Follow skill `render-and-master`, then `bilibili-publish`.

1. `npx tsc --noEmit` must be clean. Fill `src/data/credits.ts` (LINES_OF_CODE) before rendering.
2. `tools/render_all.sh` → per-segment video-only chunks (frame-exact boundaries) → `out/film_video.mp4`.
   Re-render only changed segments (`tools/render_all.sh C E`).
3. Audio: `node tools/dump_sfx.mjs` → `python3 work/sfx.py work/writing_sfx.json public/audio/song.wav
   public/audio/song_sfx.wav`.
4. `tools/master.sh out/film_video.mp4 output/<name>.mp4`. Verify: full decode with `ffmpeg -v error -f null -`,
   `ebur128` integrated ≈ −14 LUFS and true peak ≤ −1 dBTP, H.264 level matches bitrate.
5. Cover (`src/lab/cover.ts`, render at scale 1.35, crop 1920×1080 and the 4:3 1440×1080 safe crop), subtitles
   (`python3 work/make_srt.py`), description with chapters and quotation credits.

Known traps (each one happened):
- single-pass dynamic `loudnorm` produces a loud burst in the first second → use linear gain from a measurement;
- uncapped crf 14 hit 23 Mbps at Level 4.0 → files would not open in hardware-decoding players → cap
  `-maxrate 20M -bufsize 40M`, `-level 4.1`, ASCII file name;
- per-frame film grain flickering at 12 Hz wrecks Bilibili's re-encode → grain × 0.45 at 8 Hz;
- a background encode dies with the session → check duration of the output before reporting success.
