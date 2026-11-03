"""Synthesise pen-on-paper writing sounds for given time spans and mix them under the music.

usage: python3 work/sfx.py work/writing_sfx.json audio/song.wav public/audio/song_sfx.wav
spans json: [[t0, t1], ...] in seconds (global film time)
"""
import json, sys
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

spans = json.load(open(sys.argv[1]))
music, sr = sf.read(sys.argv[2], always_2d=True)
out = music.copy()
rng = np.random.default_rng(7)

bp = butter(4, [1800, 7500], btype='bandpass', fs=sr, output='sos')
lo = butter(2, [300, 1200], btype='bandpass', fs=sr, output='sos')

def stroke(dur):
    n = int(dur * sr)
    noise = rng.standard_normal(n)
    hiss = sosfilt(bp, noise)
    body = sosfilt(lo, rng.standard_normal(n)) * 0.25
    # nib micro-stutter: 25–45 Hz grain modulation, plus pressure envelope
    t = np.arange(n) / sr
    f = rng.uniform(25, 45)
    grain = 0.55 + 0.45 * np.abs(np.sin(2 * np.pi * f * t + rng.uniform(0, 6))) ** 3
    env = np.minimum(1, t / 0.015) * np.minimum(1, (dur - t) / 0.04)
    env *= 0.7 + 0.3 * np.sin(np.pi * t / max(dur, 1e-3))
    return (hiss + body) * grain * env

total = 0
for t0, t1 in spans:
    # break each span into short strokes (a character ≈ 3–6 strokes)
    t = t0
    while t < t1:
        d = min(rng.uniform(0.05, 0.16), t1 - t)
        if d < 0.03:
            break
        s = stroke(d)
        i = int(t * sr)
        j = min(len(out), i + len(s))
        if i >= len(out):
            break
        g = 0.05 * rng.uniform(0.6, 1.0)
        pan = rng.uniform(-0.25, 0.25)
        out[i:j, 0] += s[: j - i] * g * (1 - pan)
        out[i:j, 1] += s[: j - i] * g * (1 + pan)
        t += d + rng.uniform(0.02, 0.09)
        total += 1
peak = np.max(np.abs(out))
if peak > 0.99:
    out *= 0.99 / peak
sf.write(sys.argv[3], out, sr, subtype='PCM_16')
print('strokes', total, 'peak', round(float(peak), 3))
