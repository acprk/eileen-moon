"""Score, sound design and voice-over mix for 米麦 产品说明书 v7 (v7.js), 60 s, 120 BPM. Built on ../../tools/synth.py.

What the three Apple films taught (measured on the supplied references):
  · ~120 BPM, the energy sits in the sub (60–75 % of it below 120 Hz), little top end
  · one sound per thing that appears; every word in the verb run gets its own hit
  · a breath of silence right before each reveal (12.6 s, 47.5 s), and the end card plays in silence
  · mastered around -16 LUFS with 5–9 LU of range, not slammed
The voice-over (tools/vo_v7.py) sits on top; the music ducks ~7 dB under it.

usage: python3 -I music_v7.py <out.wav> [vo_dir]     (no vo_dir → music and effects only)
"""
import json
import os
import re
import sys

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'tools'))
from synth import Mix  # noqa: E402

out = sys.argv[1]
vo_dir = sys.argv[2] if len(sys.argv) > 2 else None
m = Mix(60.6, seed=77)
B = 0.5
# D major: I – V – vi – IV, one chord per bar (2 s)
CH = [[50, 57, 62, 66], [45, 52, 57, 61], [47, 54, 59, 62], [43, 50, 55, 59]]
ROOT = [38, 33, 35, 31]
bar = lambda t: int((t // 2.0) % 4)


def pad(a, b, notes, g, lo=110, hi=2200):
    i0, i1, l, r = m.pad(notes, a, b)
    l = m.filt(l, lo, hi); r = m.filt(r, lo, hi)
    m.L[i0:i1] += (l + r) * 0.5 * g; m.SIDE[i0:i1] += (l - r) * 0.5 * g * 1.3; m.REV[i0:i1] += (l + r) * 0.5 * g * 0.6


def sine(f, length, a=0.01, d=0.3, glide=None):
    n = int(m.SR * length); t = np.arange(n) / m.SR
    fr = f if glide is None else f * (glide / f) ** (t / length)
    return np.sin(2 * np.pi * np.cumsum(np.full(n, fr) if np.isscalar(fr) else fr) / m.SR) * m.env(n, a, d)


def sub(t0, t1, midi, g=0.5):
    """a held sub-bass note with soft edges"""
    f = m.mtof(midi); n = m.idx(t1) - m.idx(t0); tt = np.arange(n) / m.SR
    s = np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(4 * np.pi * f * tt)
    e = np.minimum(1, tt / 0.03) * np.minimum(1, (n / m.SR - tt) / 0.06)
    m.add(m.L, t0, s * e, g)


# ── 0–3.4 出品: a sub swell, a glint as the gold line draws, two notes under the type
n = m.idx(3.4); tt = np.arange(n) / m.SR
m.L[:n] += 0.35 * np.sin(2 * np.pi * 36.7 * tt) * np.sin(np.pi * np.clip(tt / 3.4, 0, 1)) ** 2
m.both(0.32, m.bell(86, 2.0), 0.12, 0.6)
m.both(0.62, m.pluck(62, 1.2), 0.22, 0.5); m.both(1.17, m.pluck(69, 1.2), 0.18, 0.5)
m.both(2.5, m.riser(0.95, 0.22, 300), 0.6, 0.4)
# ── 3.45 米麦: the first chord lands; a shimmer with the light sweep
m.add(m.L, 3.45, m.impact(0.38)); m.add(m.REV, 3.45, m.impact(0.2))
pad(3.45, 5.75, [50, 57, 62, 66, 69], 0.3)
sub(3.45, 5.8, 26, 0.35)
m.both(4.25, m.whoosh(0.9, 0.16), 0.5, 0.5); m.both(4.6, m.bell(93, 1.6), 0.08, 0.6)
m.both(5.55, m.riser(0.32, 0.18, 500), 0.6, 0.3)

# ── 5.85–12.85 the seven assets: a kick and a note per field, an iris whoosh, one signature sound each
MEL = [62, 64, 66, 69, 71, 74, 76]
for k in range(7):
    a = 6.0 + k
    m.add(m.L, a - 0.15, m.whoosh(0.32, 0.22))
    m.add(m.L, a, m.kick(0.95)); m.add(m.L, a + 0.5, m.kick(0.55))
    m.both(a + 0.02, m.pluck(MEL[k], 0.7), 0.3, 0.35); m.both(a + 0.02, m.pluck(MEL[k] - 12, 0.7), 0.15, 0.2)
    for h in range(4):
        m.add(m.L, a + 0.25 * h + 0.125, m.hat(False), 0.08)
    sub(a, a + 0.95, ROOT[k % 4] - 12 + 12, 0.32)
    sig = [m.bell(81, 1.0), m.blip(1200, 0.12), m.pop(1000), m.blip(1600, 0.08), m.bell(88, 1.2), m.pluck(81, 0.5), m.bell(93, 1.2)][k]
    m.both(a + 0.1, sig, 0.14, 0.35)
    if k == 1:
        for j in range(6):
            m.add(m.L, a + 0.12 + j * 0.08, m.blip(900 + j * 160, 0.06), 0.06)
    if k == 3:
        for j in range(5):
            m.add(m.L, a + 0.1 + j * 0.06, m.tick(), 0.12)
pad(6.0, 12.55, [50, 57, 62, 66], 0.12)
# a breath of silence, then 都是你的资产
m.both(12.85, m.whoosh(0.4, 0.2), 0.6, 0.3)
m.add(m.L, 13.15, m.impact(0.5)); m.add(m.REV, 13.15, m.impact(0.3))
m.both(13.15, m.bell(74, 2.4), 0.16, 0.6); m.both(13.18, m.bell(78, 2.4), 0.12, 0.6); m.both(13.21, m.bell(81, 2.4), 0.1, 0.6)
pad(13.15, 14.9, [50, 57, 62, 66, 69, 74], 0.26)
sub(13.15, 14.9, 26, 0.4)
for i in range(7):
    m.add(m.L, 12.95 + i * 0.045, m.pop(700 + i * 90), 0.08)

# ── 15–47 the manual: a 120 BPM groove under the five steps
groove = lambda t: 15.0 <= t < 47.2 and not (33.7 <= t < 34.3)
for k in range(30, 95):
    t = k * B
    if not groove(t):
        continue
    m.add(m.L, t, m.kick(0.8 if k % 2 == 0 else 0.55))
    m.add(m.L, t + 0.25, m.hat(k % 4 == 3), 0.11)
    if k % 4 == 2:
        c = m.clap(); m.add(m.L, t, c, 0.12); m.add(m.REV, t, c, 0.18)
for b0 in np.arange(15.0, 47.0, 2.0):
    ci = bar(b0)
    pad(b0, b0 + 2.0, CH[ci], 0.11)
    for q in range(4):
        sub(b0 + q * 0.5, b0 + q * 0.5 + 0.42, ROOT[ci] - 12, 0.42 if q == 0 else 0.3)
    for q in range(8):   # a quiet arpeggio, every other bar
        if int(b0 / 2) % 2:
            m.both(b0 + q * 0.25, m.pluck(CH[ci][q % 4] + 12, 0.25, 0.7), 0.05, 0.15)

# step 01: scan, mesh points, cipher glitter, the lock
m.both(15.15, m.whoosh(0.6, 0.18), 0.6, 0.3)
m.both(16.35, m.riser(1.2, 0.1, 800), 0.8, 0.2)
for j in range(10):
    m.add(m.L, 16.6 + j * 0.07, m.pop(1400 + (j % 4) * 220), 0.05)
for j in range(40):
    m.add(m.L, 17.9 + j * 0.031, m.tick(), 0.05 + 0.04 * (j % 3 == 0))
m.both(17.9, m.noise(1.25, 4000, 12000, 0.6, 0.05), 0.5, 0.3)
m.add(m.L, 19.3, m.thunk(), 0.4); m.both(19.32, m.bell(81, 1.4), 0.14, 0.4); m.both(19.34, m.bell(86, 1.4), 0.08, 0.4)
# step 02: the needle comes down, engraves (a fine hiss with sparkle), lifts; the card turns over
m.both(20.85, m.whoosh(0.6, 0.16), 0.6, 0.3)
m.add(m.L, 21.25, m.whoosh(0.35, 0.1))
for a, b in [(21.6, 22.7), (22.85, 23.6)]:
    hiss = m.noise(b - a, 5000, 14000, 10.0, 1.0); hiss *= np.minimum(1, np.arange(len(hiss)) / (0.03 * m.SR)) * np.minimum(1, (len(hiss) - np.arange(len(hiss))) / (0.05 * m.SR))
    m.add(m.L, a, hiss, 0.035)
    for j in range(int((b - a) / 0.11)):
        m.both(a + j * 0.11, m.blip(4200 + (j % 3) * 600, 0.04), 0.02, 0.1)
m.add(m.L, 23.65, m.whoosh(0.3, 0.08))
m.both(24.3, m.whoosh(0.8, 0.26), 0.6, 0.4); m.add(m.L, 25.0, m.thunk(), 0.18); m.both(25.02, m.bell(78, 1.4), 0.1, 0.4)
# step 03: arcs, the notification, the tap, approved
m.both(26.9, m.whoosh(0.6, 0.16), 0.6, 0.3)
m.both(28.3, m.blip(1318, 0.12), 0.16, 0.2); m.both(28.42, m.blip(1760, 0.16), 0.14, 0.2)
m.add(m.L, 30.55, m.click(), 0.4)
m.both(31.05, m.blip(1046, 0.1), 0.14, 0.25); m.both(31.15, m.blip(1568, 0.18), 0.14, 0.3); m.both(31.2, m.bell(84, 1.2), 0.08, 0.4)
# step 04: the glow swells; click — it powers down
m.both(33.8, m.whoosh(0.5, 0.14), 0.6, 0.3)
m.both(34.25, m.riser(0.7, 0.12, 120), 0.6, 0.3); sub(34.3, 36.9, 26, 0.28)
m.add(m.L, 36.95, m.click(), 0.5); m.add(m.L, 36.96, m.thunk(), 0.35)
m.both(37.0, sine(420, 0.6, 0.005, 0.25, glide=110), 0.2, 0.3)
# step 05: the counter rolls, a coin per income, a register on the first and the last
m.both(39.9, m.whoosh(0.55, 0.2), 0.6, 0.3)
for j in range(20):
    m.add(m.L, 40.45 + j * 0.03, m.tick(), 0.08)
INC = [41.1, 41.75, 42.4, 43.05, 43.7, 44.45]
for i, ti in enumerate(INC):
    m.both(ti, m.coin(2400 + i * 140), 0.2, 0.25)
    if i in (0, 5):
        m.both(ti + 0.02, m.kaching(), 0.26, 0.3)
m.both(46.9, m.whoosh(0.5, 0.2), 0.6, 0.3); m.both(47.0, m.riser(0.45, 0.14, 400), 0.6, 0.3)

# ── 47.5–48 silence. 48–51 the verbs, one hit each, each with its own sound
for k in range(6):
    a = 48.0 + k * 0.5
    m.add(m.L, a, m.kick(1.0)); c = m.clap(); m.add(m.L, a, c, 0.16); m.add(m.REV, a, c, 0.2)
    sub(a, a + 0.45, [38, 38, 35, 35, 31, 33][k] - 12 + 12, 0.45)
    if k == 0: m.add(m.L, a, m.whoosh(0.3, 0.12))
    if k == 1:
        for j in range(3): m.add(m.L, a + j * 0.09, m.click(), 0.22)
    if k == 2: m.both(a, m.whoosh(0.4, 0.2), 0.6, 0.4)
    if k == 3:
        for j in range(9): m.add(m.L, a + j * 0.035, m.blip(600 + (j * 397) % 1800, 0.03), 0.06)
    if k == 4:
        for j in range(3): m.add(m.L, a + j * 0.03, m.pop(800 + j * 200), 0.12)
    if k == 5: m.both(a, m.kaching(), 0.24, 0.35); m.both(a + 0.02, m.bell(81, 1.6), 0.12, 0.5)
# ── 51.7 由你决定: only a chord; 53.8 the slogan: the last swell; then silence for the end card
pad(51.6, 53.7, [43, 50, 55, 59, 62], 0.22); sub(51.6, 53.7, 31, 0.32)
m.both(51.85, m.bell(74, 2.0), 0.1, 0.6)
m.add(m.L, 53.95, m.impact(0.42)); m.add(m.REV, 53.95, m.impact(0.25))
pad(53.95, 56.9, [50, 57, 62, 66, 69, 74], 0.28); sub(53.95, 56.9, 26, 0.4)
m.both(55.2, m.bell(81, 2.0), 0.1, 0.6); m.both(55.22, m.bell(86, 2.0), 0.07, 0.6)
m.both(57.5, m.bell(93, 2.2), 0.05, 0.6)                                   # the logo glint, nearly nothing

# ── voice-over: per-line RMS levelled, high-passed, gently compressed; music ducks under it
vo = np.zeros(m.N); duck = np.ones(m.N)
if vo_dir:
    txt = open(os.path.join(HERE, '..', 'v7_vo.js'), encoding='utf-8').read()
    rows = json.loads(re.search(r'=\s*(\[.*\])', txt, re.S).group(1))
    for i, r in enumerate(rows):
        x, sr = sf.read(os.path.join(vo_dir, f'vo_{i:02d}.wav'), dtype='float64')
        if sr != m.SR:   # exact 2× resample by zero-padding the spectrum
            X = np.fft.rfft(x); k = m.SR // sr; n2 = len(x) * k
            Y = np.zeros(n2 // 2 + 1, complex); Y[:len(X)] = X; x = np.fft.irfft(Y, n2) * k
        x = m.filt(x, 85, 11000)
        x /= np.sqrt(np.mean(x[np.abs(x) > 0.02 * np.max(np.abs(x))] ** 2)) + 1e-9
        env = np.sqrt(np.convolve(x ** 2, np.ones(480) / 480, 'same')) + 1e-6       # 10 ms RMS compressor, 3:1 above -12 dB
        lvl = 20 * np.log10(env); gr = np.where(lvl > -12, (lvl + 12) * (1 - 1 / 3), 0)
        x *= 10 ** (-gr / 20)
        m.add(vo, r['t'], x, 1.0)
        i0, i1 = m.idx(r['t'] - 0.12), min(m.N, m.idx(r['t'] + r['d'] + 0.25))
        duck[i0:i1] = 10 ** (-7 / 20)
    duck = np.convolve(duck, np.ones(int(0.12 * m.SR)) / int(0.12 * m.SR), 'same')
    vo *= 0.24
m.L *= duck; m.SIDE *= duck; m.REV *= duck
m.L += vo; m.REV += vo * 0.1
pk = m.master(out, lufs_window=(15, 47), target_rms_db=-15.6, peak=0.84, fade=(59.7, 60.5))
print('peak', round(pk, 3), 'vo' if vo_dir else 'music only')
