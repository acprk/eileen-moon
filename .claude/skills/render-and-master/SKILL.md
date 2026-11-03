---
name: render-and-master
description: Render the locked film at 1080P in frame-exact per-segment chunks, synthesise pen-writing SFX, mix, set loudness linearly to −14 LUFS, and encode a player-compatible H.264 master (High@4.1, VBV-capped). Includes the traps hit in production. Use at picture lock and after any segment re-render.
---

# Render & master

```bash
npx tsc --noEmit                                   # must be clean
tools/render_all.sh                                # all chunks → out/film_video.mp4   (≈25 min, 8 workers)
tools/render_all.sh C E                            # only changed segments, then re-concat
node tools/dump_sfx.mjs                            # collect WRITING_SFX spans from scenes
python3 work/sfx.py work/writing_sfx.json public/audio/song.wav public/audio/song_sfx.wav
tools/master.sh out/film_video.mp4 output/EileenChang_A_Night_with_a_Moon_1080p.mp4
```

## Checks before calling it done
```bash
ffmpeg -v error -i output/X.mp4 -f null -                                  # zero decode errors
ffmpeg -hide_banner -nostats -i output/X.mp4 -af ebur128=peak=true -f null - 2>&1 | tail -n 12   # ≈ −14 LUFS, TP ≤ −1
ffprobe -v error -show_entries stream=profile,level,pix_fmt:format=duration,bit_rate -of compact output/X.mp4
```

## Traps (all real)
| Symptom | Cause | Fix |
|---|---|---|
| loud burst in the first second | single-pass dynamic `loudnorm` | measure, then linear `volume` (song −11.7 LUFS → −2.3 dB) |
| "下载之后点不开" | crf 14 uncapped = 23 Mbps at Level 4.0; hardware decoders refuse | `-level 4.1 -maxrate 20M -bufsize 40M`, crf 16, ASCII file name |
| blocky mush after Bilibili re-encode | per-frame grain at 12 Hz | `GRAIN_SCALE = 0.45`, grain at 8 Hz |
| master shorter than the film | encode killed with the session | check `duration` of the output every time |
| audio gaps at chunk joins | rendering audio per chunk | render chunks `--muted`, add audio once in master |
| delayRender timeouts | too many tabs | concurrency ≤ 8, `timeoutInMilliseconds: 120000` |
