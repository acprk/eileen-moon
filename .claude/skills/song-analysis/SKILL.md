---
name: song-analysis
description: Turn a song file into the film's timing skeleton — beat grid and energy curve (librosa), lyric-line timestamps (whisper word timestamps + manual correction against the published lyric), section map and beat helpers. Use before writing the narration or cutting any scene.
---

# Song → timing skeleton

1. Put your own licensed copy of the song at `public/audio/song.wav` (never commit it).
2. Beats + energy: `python3 work/beats.py` → `work/beats.json` (tempo, beats[], onsets[], rms_db_100ms[]),
   then copy to `src/data/beats.json`. The script prints a 4-second energy bar chart: sections jump out
   (here: intro −40 dB → verse −27 → chorus −17 → climax −11 → drop at 247.8 s).
3. Lyrics: `python3 work/asr.py public/audio/song.wav work/asr.json` (whisper small, word timestamps, an
   initial prompt with the artist/title). Whisper hallucinates on quiet intros and mishears words: re-run on a
   cropped window for missing lines, then align to the published lyric by hand. Store only TIMINGS in the repo
   (`src/data/lyrics.ts`); lyric text is copyrighted.
4. Map sections to beat indices (`nearestBeat`): phrase starts fall every 16 beats here (≈ 8.2 s).
5. In code: `BEATS`, `beatIndex(t)`, `beatTime(i)`, `nearestBeat(t)`, `beatPulse(t, decay, every)`,
   `beatPos(t)` from `src/lib/math.ts`. Cut on `beatTime(i)`; accents on `beatPulse`.
