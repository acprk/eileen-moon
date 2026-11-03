#!/bin/bash
# Bilibili upload master from the Remotion render.
#   tools/master.sh out/film_video.mp4 output/张爱玲_一个有月亮的晚上_B站.mp4
# - audio: song + pen-writing sfx (public/audio/song_sfx.wav if present), trimmed to the film, 4.5 s fade-out,
#   LINEAR gain to -14 LUFS (the song is mastered at -11.7 LUFS / +0.2 dBTP → -2.3 dB gives -14.0 / -2.0 dBTP).
#   (Single-pass dynamic loudnorm was dropped: it produced a loud burst in the first second.)
# - video: x264 High@4.1, crf 16 with VBV cap 20 Mbps (uncapped crf 14 hit ~23 Mbps at level 4.0 and would not
#   open in hardware-decoding players), preset slow, 24 fps, keyint 48, BT.709 tags, faststart
set -e
in=$1
out=$2
root=$(cd "$(dirname "$0")/.." && pwd)
mix="$root/public/audio/song_sfx.wav"
[ -f "$mix" ] || mix="$root/public/audio/song.wav"
mkdir -p "$root/out" "$(dirname "$out")"
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in")
fade=$(python3 -c "print(round($dur - 4.5, 3))")
ffmpeg -v error -y -i "$mix" -t "$dur" -af "afade=t=out:st=$fade:d=4.5,volume=-2.3dB" -ar 48000 "$root/out/mix_master.wav"
ffmpeg -v error -stats -y -i "$in" -i "$root/out/mix_master.wav" \
  -map 0:v:0 -map 1:a:0 -shortest \
  -c:v libx264 -profile:v high -level:v 4.1 -preset slow -crf 16 -maxrate 20M -bufsize 40M -tune film \
  -x264-params "keyint=48:min-keyint=24:aq-mode=3:deblock=-1,-1" -tag:v avc1 \
  -pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709 -r 24 \
  -c:a aac -b:a 320k -ar 48000 -movflags +faststart "$out"
ffprobe -v error -show_entries format=duration,bit_rate:stream=codec_name,width,height,r_frame_rate -of compact "$out"
