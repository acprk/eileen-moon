#!/bin/bash
# Render the film at 1080P (1920x804) in per-segment video-only chunks, then concatenate.
#   tools/render_all.sh            # all segments
#   tools/render_all.sh C E        # re-render only these chunks, then re-concat
# Chunk boundaries are frame-exact (frames [round(a*24), round(b*24)-1]).
set -e
cd "$(dirname "$0")/.."
declare -A A=([A]=0 [B]=41.471 [C]=76.324 [D]=110.573 [E]=176.866 [F]=211.603 [G]=252.331)
declare -A B=([A]=41.471 [B]=76.324 [C]=110.573 [D]=176.866 [E]=211.603 [F]=252.331 [G]=285.5)
segs=${@:-A B C D E F G}
mkdir -p out/chunks
for s in $segs; do
  f0=$(python3 -c "print(round(${A[$s]}*24)/24)")
  f1=$(python3 -c "print((round(${B[$s]}*24)-1)/24)")
  echo "== $s  $f0 .. $f1"
  node tools/render.mjs --from "$f0" --to "$f1" --conc 8 --crf 12 --muted --out "out/chunks/$s.mp4" 2>&1 | grep -v -i -e undici -e trace-warn | tail -1
done
: > out/chunks/list.txt
for s in A B C D E F G; do echo "file '$s.mp4'" >> out/chunks/list.txt; done
ffmpeg -v error -y -f concat -safe 0 -i out/chunks/list.txt -c copy out/film_video.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 out/film_video.mp4
